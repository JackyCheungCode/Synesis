import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromB64 = (value: string) => Uint8Array.from(atob(value), c => c.charCodeAt(0));

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const authorization = req.headers.get('Authorization') ?? '';
    const jwt = authorization.replace(/^Bearer\s+/i, '');
    if (!jwt) return json({ error: '需要登录后操作' }, 401);
    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceKey) return json({ error: '后端数据库服务尚未配置' }, 503);
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await admin.auth.getUser(jwt);
    if (authError || !authData.user) return json({ error: '登录状态无效，请重新登录' }, 401);
    const userId = authData.user.id;
    const body = await req.json();
    const action = String(body.action ?? '');
    const encryptionKey = Deno.env.get('CREDENTIAL_ENCRYPTION_KEY') ?? '';

    async function encryptSecret(secret: string) {
      if (!/^[A-Za-z0-9+/]{43}=$/.test(encryptionKey)) throw new Error('凭证加密密钥尚未配置；请先设置 CREDENTIAL_ENCRYPTION_KEY（32 字节 Base64）');
      const raw = fromB64(encryptionKey);
      if (raw.length !== 32) throw new Error('凭证加密密钥格式错误');
      const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt']);
      const nonce = crypto.getRandomValues(new Uint8Array(12));
      const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, new TextEncoder().encode(secret));
      return { ciphertext: b64(new Uint8Array(ciphertext)), nonce: b64(nonce), key_version: 'v1' };
    }
    async function decryptSecret(ciphertext: string, nonce: string) {
      const raw = fromB64(encryptionKey);
      const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
      const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(nonce) }, key, fromB64(ciphertext));
      return new TextDecoder().decode(clear);
    }
    async function getCredential(slug: string, kind: string) {
      const table = kind === 'provider' ? 'ai_provider_configs' : 'integration_connections';
      const secretTable = kind === 'provider' ? 'ai_provider_credentials' : 'integration_credentials';
      const idColumn = kind === 'provider' ? 'config_id' : 'connection_id';
      const { data: config, error } = await admin.from(table).select('*').eq('user_id', userId).eq(kind === 'provider' ? 'provider_slug' : 'service_slug', slug).maybeSingle();
      if (error || !config) throw new Error('找不到该凭证配置');
      const { data: secret, error: secretError } = await admin.schema('private').from(secretTable).select('ciphertext,nonce').eq(idColumn, config.id).single();
      if (secretError || !secret) throw new Error('凭证密文不存在');
      const clear = await decryptSecret(secret.ciphertext, secret.nonce);
      return { config, clear };
    }

    if (action === 'credentials.list') {
      const [p, i] = await Promise.all([
        admin.from('ai_provider_configs').select('provider_slug,display_name,connection_status,key_last4,last_validated_at').eq('user_id',userId),
        admin.from('integration_connections').select('service_slug,display_name,connection_status,key_last4,last_validated_at').eq('user_id',userId),
      ]);
      if (p.error || i.error) throw p.error ?? i.error;
      const credentials = [
        ...(p.data ?? []).map(x=>({slug:x.provider_slug,name:x.display_name,kind:'provider',status:x.connection_status,key_last4:x.key_last4,last_validated_at:x.last_validated_at})),
        ...(i.data ?? []).map(x=>({slug:x.service_slug,name:x.display_name,kind:'integration',status:x.connection_status,key_last4:x.key_last4,last_validated_at:x.last_validated_at})),
      ];
      return json({ credentials });
    }

    if (action === 'credentials.save') {
      const { slug, name, kind, apiKey } = body;
      if (!/^[a-z0-9_-]{2,48}$/.test(slug) || !['provider','integration'].includes(kind) || typeof apiKey !== 'string' || apiKey.length < 8 || apiKey.length > 8192) return json({error:'凭证参数无效'},400);
      const encrypted = await encryptSecret(apiKey);
      const table = kind === 'provider' ? 'ai_provider_configs' : 'integration_connections';
      const secretTable = kind === 'provider' ? 'ai_provider_credentials' : 'integration_credentials';
      const idColumn = kind === 'provider' ? 'config_id' : 'connection_id';
      const slugColumn = kind === 'provider' ? 'provider_slug' : 'service_slug';
      const { data: config, error } = await admin.from(table).upsert({
        user_id:userId, [slugColumn]:slug, display_name:String(name).slice(0,100),
        connection_status:'configured', key_last4:apiKey.slice(-4), enabled:true, updated_at:new Date().toISOString(),
      },{onConflict:`user_id,${slugColumn}`}).select('id').single();
      if (error || !config) throw error ?? new Error('保存凭证配置失败');
      const { error: secretError } = await admin.schema('private').from(secretTable).upsert({
        [idColumn]:config.id, ciphertext:encrypted.ciphertext, nonce:encrypted.nonce, key_version:encrypted.key_version, updated_at:new Date().toISOString(),
      });
      if (secretError) throw secretError;
      return json({ok:true});
    }

    if (action === 'connection.test') {
      const { slug, kind, model } = body;
      const { config, clear } = await getCredential(slug,kind);
      let response: Response;
      if (kind === 'integration' && slug === 'apify') {
        response = await fetch('https://api.apify.com/v2/users/me',{headers:{Authorization:`Bearer ${clear}`}});
      } else if (kind === 'provider') {
        const prompt = 'Reply with exactly: SYNESIS_CONNECTION_OK';
        if (slug === 'openai' || slug === 'deepseek' || slug === 'mistral' || slug === 'x') {
          const base = slug==='openai'?'https://api.openai.com/v1':slug==='deepseek'?'https://api.deepseek.com':slug==='mistral'?'https://api.mistral.ai/v1':'https://api.x.ai/v1';
          response = await fetch(`${base}/chat/completions`,{method:'POST',headers:{Authorization:`Bearer ${clear}`,'Content-Type':'application/json'},body:JSON.stringify({model:model||'gpt-4.1-mini',messages:[{role:'user',content:prompt}],max_tokens:16})});
        } else if (slug === 'googlegemini') {
          response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model||'gemini-2.5-flash'}:generateContent?key=${encodeURIComponent(clear)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{maxOutputTokens:16}})});
        } else if (slug === 'anthropic') {
          response = await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'x-api-key':clear,'anthropic-version':'2023-06-01','content-type':'application/json'},body:JSON.stringify({model:model||'claude-3-7-sonnet-latest',max_tokens:16,messages:[{role:'user',content:prompt}]})});
        } else if (slug === 'cloudflare') {
          return json({error:'Workers AI 需要 Cloudflare Account ID 与 API Token；请先在 Cloudflare 集成凭证中配置。'},400);
        } else return json({error:'该 Provider 尚未实现连接测试'},400);
      } else return json({error:'该集成尚未实现连接测试'},400);
      if (!response.ok) {
        const detail = (await response.text()).slice(0,500);
        await admin.from(kind==='provider'?'ai_provider_configs':'integration_connections').update({connection_status:'error'}).eq('id',config.id).eq('user_id',userId);
        return json({error:`服务返回 HTTP ${response.status}: ${detail}`},502);
      }
      await admin.from(kind==='provider'?'ai_provider_configs':'integration_connections').update({connection_status:'validated',last_validated_at:new Date().toISOString()}).eq('id',config.id).eq('user_id',userId);
      return json({ok:true,message:'凭证有效，服务请求成功'});
    }

    if (action === 'ai.invoke') {
      const { provider, model, messages } = body;
      const { clear } = await getCredential(provider,'provider');
      let response: Response;
      if (provider === 'openai' || provider === 'deepseek' || provider === 'mistral' || provider === 'x') {
        const base = provider==='openai'?'https://api.openai.com/v1':provider==='deepseek'?'https://api.deepseek.com':provider==='mistral'?'https://api.mistral.ai/v1':'https://api.x.ai/v1';
        response = await fetch(`${base}/chat/completions`,{method:'POST',headers:{Authorization:`Bearer ${clear}`,'Content-Type':'application/json'},body:JSON.stringify({model,messages})});
      } else if (provider === 'googlegemini') {
        const prompt = (messages ?? []).map((m: {role:string;content:string})=>`${m.role}: ${m.content}`).join('\n');
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(clear)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}]})});
      } else if (provider === 'anthropic') {
        response = await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'x-api-key':clear,'anthropic-version':'2023-06-01','content-type':'application/json'},body:JSON.stringify({model,max_tokens:4096,messages})});
      } else return json({error:'该模型路由暂不支持'},400);
      const result = await response.json();
      if (!response.ok) return json({error:result?.error?.message ?? '模型调用失败'},502);
      return json({result});
    }

    if (action === 'plans.generate') {
      const { projectId, provider } = body;
      const { data: project, error: projectError } = await admin.from('research_projects').select('*').eq('id',projectId).eq('user_id',userId).single();
      if (projectError || !project) throw new Error('研究项目不存在');
      const { clear } = await getCredential(provider,'provider');
      const system = 'You are Synesis global trade research planner. Return valid JSON only with keys: executive_summary, research_questions (array), platform_tasks (array of objects {platform_slug, actor_id, input, purpose}), methodology, deliverables, estimated_cost_usd. Never invent exact Apify actor IDs; use null when unknown. Tasks must be proposed only, not executed.';
      const prompt = JSON.stringify({project});
      let response: Response;
      if (provider==='openai'||provider==='deepseek'||provider==='mistral'||provider==='x') {
        const base=provider==='openai'?'https://api.openai.com/v1':provider==='deepseek'?'https://api.deepseek.com':provider==='mistral'?'https://api.mistral.ai/v1':'https://api.x.ai/v1';
        response=await fetch(`${base}/chat/completions`,{method:'POST',headers:{Authorization:`Bearer ${clear}`,'Content-Type':'application/json'},body:JSON.stringify({model:provider==='openai'?'gpt-4.1-mini':provider==='deepseek'?'deepseek-chat':provider==='mistral'?'mistral-small-latest':'grok-3-mini',messages:[{role:'system',content:system},{role:'user',content:prompt}],response_format:{type:'json_object'}})});
      } else if(provider==='googlegemini') {
        response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(clear)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents:[{parts:[{text:prompt}]}],generationConfig:{responseMimeType:'application/json'}})});
      } else if(provider==='anthropic') {
        response=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'x-api-key':clear,'anthropic-version':'2023-06-01','content-type':'application/json'},body:JSON.stringify({model:'claude-3-7-sonnet-latest',max_tokens:4096,system,messages:[{role:'user',content:prompt}]})});
      } else throw new Error('该 Provider 暂不支持计划生成');
      const result=await response.json();
      if(!response.ok) throw new Error(result?.error?.message??'AI 计划生成失败');
      const raw=provider==='googlegemini'?result.candidates?.[0]?.content?.parts?.[0]?.text:provider==='anthropic'?result.content?.[0]?.text:result.choices?.[0]?.message?.content;
      const plan=JSON.parse(String(raw).replace(/^\`\`\`json\s*/,'').replace(/\`\`\`$/,''));
      const {error}=await admin.from('ai_research_plans').insert({user_id:userId,project_id:projectId,plan,status:'pending_approval',estimated_cost:plan.estimated_cost_usd??null});
      if(error) throw error;
      await admin.from('research_projects').update({status:'awaiting_approval'}).eq('id',projectId).eq('user_id',userId);
      return json({ok:true,plan});
    }

    if (action === 'plans.approve') {
      const {planId}=body;
      const {data:plan,error}=await admin.from('ai_research_plans').select('*').eq('id',planId).eq('user_id',userId).single();
      if(error||!plan||plan.status!=='pending_approval') return json({error:'研究计划不存在或已处理'},409);
      const {error:updateError}=await admin.from('ai_research_plans').update({status:'approved',approved_at:new Date().toISOString(),approved_by:userId}).eq('id',planId).eq('user_id',userId).eq('status','pending_approval');
      if(updateError) throw updateError;
      const items=Array.isArray(plan.plan?.platform_tasks)?plan.plan.platform_tasks:[];
      const rows=items.map((item: {platform_slug?:string;actor_id?:string|null;input?:Record<string,unknown>})=>({
        user_id:userId,project_id:plan.project_id,plan_id:planId,platform_slug:String(item.platform_slug??'unknown'),
        actor_id:item.actor_id??null,input:item.input??{},status:'queued',
      }));
      if(rows.length){const {error:taskError}=await admin.from('collection_tasks').insert(rows);if(taskError)throw taskError;}
      await admin.from('research_projects').update({status:'active'}).eq('id',plan.project_id).eq('user_id',userId);
      return json({ok:true,created_tasks:rows.length});
    }

    if (action === 'tasks.execute') {
      const {taskId}=body;
      const {data:task,error}=await admin.from('collection_tasks').select('*,ai_research_plans!inner(status)').eq('id',taskId).eq('user_id',userId).single();
      if(error||!task||task.ai_research_plans.status!=='approved'||!task.actor_id) return json({error:'任务未获人工审批，或缺少经确认的 Apify Actor ID'},403);
      const {clear:apifyToken}=await getCredential('apify','integration');
      const actor=encodeURIComponent(task.actor_id).replace(/%2F/g,'~');
      const response=await fetch(`https://api.apify.com/v2/acts/${actor}/runs?token=${encodeURIComponent(apifyToken)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(task.input??{})});
      const result=await response.json();
      if(!response.ok) return json({error:result?.error?.message??'Apify 任务提交失败'},502);
      await admin.from('collection_tasks').update({status:'running',external_run_id:result.data?.id,started_at:new Date().toISOString()}).eq('id',taskId).eq('user_id',userId);
      return json({ok:true,runId:result.data?.id});
    }

    return json({error:'未知操作'},404);
  } catch (error) {
    return json({error:error instanceof Error?error.message:'服务器内部错误'},500);
  }
});
