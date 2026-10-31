import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

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
    const secretKeysRaw = Deno.env.get('SUPABASE_SECRET_KEYS');
    const secretKeys = secretKeysRaw ? JSON.parse(secretKeysRaw) : {};
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? secretKeys.default;
    if (!url || !serviceKey) return json({ error: '后端数据库服务尚未配置' }, 503);
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await admin.auth.getUser(jwt);
    if (authError || !authData.user) return json({ error: '登录状态无效，请重新登录' }, 401);
    const userId = authData.user.id;
    const body = await req.json();
    const action = String(body.action ?? '');
    async function getEncryptionKey() {
      const { data, error } = await admin.rpc('synesis_get_encryption_key');
      if (error || typeof data !== 'string') throw new Error('服务端凭证加密密钥不可用');
      const raw = fromB64(data);
      if (raw.length !== 32) throw new Error('服务端凭证加密密钥格式错误');
      return raw;
    }
    async function encryptSecret(secret: string) {
      const raw = await getEncryptionKey();
      const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt']);
      const nonce = crypto.getRandomValues(new Uint8Array(12));
      const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, new TextEncoder().encode(secret));
      return { ciphertext: b64(new Uint8Array(ciphertext)), nonce: b64(nonce), key_version: 'v1' };
    }
    async function decryptSecret(ciphertext: string, nonce: string) {
      const raw = await getEncryptionKey();
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
      const { data: secretRows, error: secretError } = await admin.rpc('synesis_get_credential', { p_kind: kind, p_config_id: config.id });
      const secret = Array.isArray(secretRows) ? secretRows[0] : null;
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
        connection_status:'configured', key_last4:apiKey.slice(-4), enabled:true, metadata: kind === 'integration' ? (body.metadata ?? {}) : undefined, updated_at:new Date().toISOString(), ...(kind === 'provider' && slug === 'cloudflare' && body.accountId ? { base_url: String(body.accountId).slice(0,80) } : {}),
      },{onConflict:`user_id,${slugColumn}`}).select('id').single();
      if (error || !config) throw error ?? new Error('保存凭证配置失败');
      const { error: secretError } = await admin.rpc('synesis_store_credential', {
        p_kind: kind, p_config_id: config.id, p_ciphertext: encrypted.ciphertext,
        p_nonce: encrypted.nonce, p_key_version: encrypted.key_version,
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
      } else if (kind === 'integration' && (slug === 'google' || slug === 'youtube')) {
        response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=Synesis&type=video&maxResults=1&key=${encodeURIComponent(clear)}`);
      } else if (kind === 'integration' && slug === 'amazon') {
        let bundle: {clientId?:string;clientSecret?:string;refreshToken?:string};
        try { bundle = JSON.parse(clear); } catch { return json({error:'Amazon 凭证请以 JSON 格式填写 clientId、clientSecret、refreshToken'},400); }
        if (!bundle.clientId || !bundle.clientSecret || !bundle.refreshToken) return json({error:'Amazon 凭证缺少 clientId、clientSecret 或 refreshToken'},400);
        response = await fetch('https://api.amazon.com/auth/o2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',refresh_token:bundle.refreshToken,client_id:bundle.clientId,client_secret:bundle.clientSecret})});
      } else if (kind === 'integration' && slug === 'ebay') {
        let bundle: {clientId?:string;clientSecret?:string};
        try { bundle = JSON.parse(clear); } catch { return json({error:'eBay 凭证请以 JSON 格式填写 clientId、clientSecret'},400); }
        if (!bundle.clientId || !bundle.clientSecret) return json({error:'eBay 凭证缺少 clientId 或 clientSecret'},400);
        response = await fetch('https://api.ebay.com/identity/v1/oauth2/token',{method:'POST',headers:{Authorization:`Basic ${btoa(bundle.clientId+':'+bundle.clientSecret)}`,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'client_credentials',scope:'https://api.ebay.com/oauth/api_scope'})});
      } else if (kind === 'integration' && slug === 'walmart') {
        let bundle: {clientId?:string;clientSecret?:string};
        try { bundle = JSON.parse(clear); } catch { return json({error:'Walmart 凭证请以 JSON 格式填写 clientId、clientSecret'},400); }
        if (!bundle.clientId || !bundle.clientSecret) return json({error:'Walmart 凭证缺少 clientId 或 clientSecret'},400);
        response = await fetch('https://marketplace.walmartapis.com/v3/token',{method:'POST',headers:{Authorization:`Basic ${btoa(bundle.clientId+':'+bundle.clientSecret)}`,'Content-Type':'application/x-www-form-urlencoded','WM_SVC.NAME':'Walmart Marketplace','WM_QOS.CORRELATION_ID':crypto.randomUUID()},body:'grant_type=client_credentials'});
      } else if (kind === 'integration' && slug === 'reddit') {
        if (!config.metadata?.clientId) return json({error:'请同时填写 Reddit OAuth Client ID'},400);
        response = await fetch('https://www.reddit.com/api/v1/access_token',{method:'POST',headers:{Authorization:`Basic ${btoa(String(config.metadata.clientId)+':'+clear)}`,'Content-Type':'application/x-www-form-urlencoded','User-Agent':'Synesis/0.1.0'},body:'grant_type=client_credentials'});
      } else if (kind === 'integration' && (slug === 'alibaba' || slug === 'aliexpress')) {
        return json({error:'凭证已支持加密保存；该平台的签名/授权测试适配器仍在开发中。'},501);
      } else if (kind === 'integration' && slug === 'tiktok') {
        if (!config.metadata?.clientKey) return json({error:'请同时填写 TikTok Client Key'},400);
        response = await fetch('https://open.tiktokapis.com/v2/oauth/token/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_key:String(config.metadata.clientKey),client_secret:clear,grant_type:'client_credentials'})});
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
          if (!config.base_url) return json({error:'请先填写 Cloudflare Account ID'},400);
          response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(config.base_url)}/ai/run/${encodeURIComponent(model || '@cf/meta/llama-3.3-70b-instruct')}`,{method:'POST',headers:{Authorization:`Bearer ${clear}`,'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:prompt}]})});
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
      } else if (provider === 'cloudflare') {
        const { config } = await getCredential(provider,'provider');
        if (!config.base_url) return json({error:'请先配置 Cloudflare Account ID'},400);
        response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(config.base_url)}/ai/run/${encodeURIComponent(model || '@cf/meta/llama-3.3-70b-instruct')}`,{method:'POST',headers:{Authorization:`Bearer ${clear}`,'Content-Type':'application/json'},body:JSON.stringify({messages})});
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
      } else if(provider==='cloudflare') {
        const {config}=await getCredential(provider,'provider');
        if(!config.base_url) throw new Error('请先配置 Cloudflare Account ID');
        response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(config.base_url)}/ai/run/@cf/meta/llama-3.3-70b-instruct`,{method:'POST',headers:{Authorization:`Bearer ${clear}`,'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'system',content:system},{role:'user',content:prompt}]})});
      } else throw new Error('该 Provider 暂不支持计划生成');
      const result=await response.json();
      if(!response.ok) throw new Error(result?.error?.message??'AI 计划生成失败');
      const raw=provider==='googlegemini'?result.candidates?.[0]?.content?.parts?.[0]?.text:provider==='anthropic'?result.content?.[0]?.text:provider==='cloudflare'?result.result?.response:result.choices?.[0]?.message?.content;
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
      const approvedContent = body.plan && typeof body.plan === 'object' ? body.plan : plan.plan;
      if (!Array.isArray(approvedContent.platform_tasks)) return json({error:'研究计划格式无效'},400);
      const {error:updateError}=await admin.from('ai_research_plans').update({plan:approvedContent,status:'approved',approved_at:new Date().toISOString(),approved_by:userId}).eq('id',planId).eq('user_id',userId).eq('status','pending_approval');
      if(updateError) throw updateError;
      const items=approvedContent.platform_tasks;
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
      if(error||!task||task.ai_research_plans.status!=='approved'||!task.actor_id||task.status!=='queued') return json({error:'任务未获人工审批、已执行，或缺少经确认的 Apify Actor ID'},403);
      const {clear:apifyToken}=await getCredential('apify','integration');
      const {data:claimed,error:claimError}=await admin.from('collection_tasks').update({status:'running',started_at:new Date().toISOString()}).eq('id',taskId).eq('user_id',userId).eq('status','queued').select('id').maybeSingle();
      if(claimError||!claimed) return json({error:'任务已被执行或状态已变化'},409);
      const actor=encodeURIComponent(task.actor_id).replace(/%2F/g,'~');
      const response=await fetch(`https://api.apify.com/v2/acts/${actor}/runs`,{method:'POST',headers:{Authorization:`Bearer ${apifyToken}`,'Content-Type':'application/json'},body:JSON.stringify(task.input??{})});
      const result=await response.json();
      if(!response.ok) { await admin.from('collection_tasks').update({status:'failed',error_message:result?.error?.message??'Apify task failed',finished_at:new Date().toISOString()}).eq('id',taskId).eq('user_id',userId); return json({error:result?.error?.message??'Apify 任务提交失败'},502); }
      await admin.from('collection_tasks').update({external_run_id:result.data?.id}).eq('id',taskId).eq('user_id',userId);
      return json({ok:true,runId:result.data?.id});
    }

    if (action === 'tasks.sync') {
      const { taskId } = body;
      const { data: task, error: taskError } = await admin.from('collection_tasks')
        .select('id,user_id,external_run_id,status,result_dataset_id,result_synced_count,result_count')
        .eq('id', taskId).eq('user_id', userId).maybeSingle();
      if (taskError || !task) return json({ error: '采集任务不存在' }, 404);
      if (!task.external_run_id) return json({ error: '任务尚未取得 Apify Run ID' }, 409);
      const { clear: apifyToken } = await getCredential('apify', 'integration');
      const runResponse = await fetch(`https://api.apify.com/v2/actor-runs/${encodeURIComponent(task.external_run_id)}`, {
        headers: { Authorization: `Bearer ${apifyToken}` },
      });
      const runPayload = await runResponse.json();
      if (!runResponse.ok) return json({ error: runPayload?.error?.message ?? '无法读取 Apify 运行状态' }, 502);
      const run = runPayload.data ?? {};
      const runStatus = String(run.status ?? 'UNKNOWN').toUpperCase();
      const terminal = ['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'].includes(runStatus);
      const status = runStatus === 'SUCCEEDED' ? 'succeeded'
        : runStatus === 'FAILED' ? 'failed'
        : runStatus === 'ABORTED' ? 'cancelled'
        : runStatus === 'TIMED-OUT' ? 'failed'
        : runStatus === 'RUNNING' ? 'running'
        : runStatus === 'READY' ? 'queued' : 'running';
      const datasetId = run.defaultDatasetId ?? task.result_dataset_id ?? null;
      let totalCount = Number(task.result_count ?? 0);
      let syncedCount = Number(task.result_synced_count ?? 0);
      let batchCount = 0;
      if (runStatus === 'SUCCEEDED' && datasetId) {
        const infoResponse = await fetch(`https://api.apify.com/v2/datasets/${encodeURIComponent(datasetId)}?fields=itemCount`, {
          headers: { Authorization: `Bearer ${apifyToken}` },
        });
        if (!infoResponse.ok) return json({ error: `无法读取结果集元数据（HTTP ${infoResponse.status}）` }, 502);
        const infoPayload = await infoResponse.json();
        totalCount = Math.max(0, Number(infoPayload.data?.itemCount ?? run.stats?.output ?? 0));
        const pageSize = 250;
        if (syncedCount < totalCount) {
          const dataResponse = await fetch(`https://api.apify.com/v2/datasets/${encodeURIComponent(datasetId)}/items?clean=false&format=json&limit=${pageSize}&offset=${syncedCount}`, {
            headers: { Authorization: `Bearer ${apifyToken}` },
          });
          if (!dataResponse.ok) return json({ error: `采集完成，但第 ${syncedCount} 条之后的结果读取失败（HTTP ${dataResponse.status}），可重试继续同步` }, 502);
          const payload = await dataResponse.json();
          const items: unknown[] = Array.isArray(payload) ? payload : [];
          if (items.length) {
            const rows = items.map((raw_data, index) => ({
              task_id: taskId, user_id: userId, item_index: syncedCount + index, raw_data,
              source_updated_at: new Date().toISOString(),
            }));
            const { error: insertError } = await admin.from('collection_task_results')
              .upsert(rows, { onConflict: 'task_id,item_index' });
            if (insertError) throw insertError;
            batchCount = items.length;
            syncedCount += items.length;
          }
          if (items.length === 0 && syncedCount < totalCount) {
            return json({ error: `结果集返回空页，已同步 ${syncedCount}/${totalCount} 条；请重试或检查源数据集` }, 502);
          }
        }
      }
      const syncComplete = runStatus === 'SUCCEEDED' && syncedCount >= totalCount;
      const update: Record<string, unknown> = {
        status, run_status: runStatus, progress: terminal ? 100 : runStatus === 'RUNNING' ? 50 : 10,
        result_dataset_id: datasetId, result_count: runStatus === 'SUCCEEDED' ? totalCount : task.result_count,
        result_synced_count: syncedCount, updated_at: new Date().toISOString(), synced_at: new Date().toISOString(),
      };
      if (runStatus === 'SUCCEEDED') {
        update.finished_at = run.finishedAt ?? new Date().toISOString();
        update.error_message = syncComplete ? null : '采集已完成，结果正在分批同步';
      } else if (terminal) {
        update.finished_at = run.finishedAt ?? new Date().toISOString();
        update.error_message = run.statusMessage ?? `Apify run ${runStatus}`;
      }
      const { error: updateError } = await admin.from('collection_tasks').update(update).eq('id', taskId).eq('user_id', userId);
      if (updateError) throw updateError;
      return json({
        ok: true,
        task: { id: taskId, status, run_status: runStatus, progress: update.progress,
          result_dataset_id: datasetId, result_count: totalCount, result_synced_count: syncedCount,
          batch_count: batchCount, result_sync_complete: syncComplete, error_message: update.error_message ?? null },
        result_truncated: !syncComplete && runStatus === 'SUCCEEDED',
      });
    }

    if (action === 'tasks.results') {
      const { taskId, limit = 100, offset = 0 } = body;
      const safeLimit = Math.min(250, Math.max(1, Number(limit) || 100));
      const safeOffset = Math.max(0, Number(offset) || 0);
      const { data: task, error } = await admin.from('collection_tasks')
        .select('id,status,run_status,result_dataset_id,result_count,result_synced_count,error_message,finished_at,synced_at')
        .eq('id', taskId).eq('user_id', userId).maybeSingle();
      if (error || !task) return json({ error: '采集任务不存在' }, 404);
      const { data: rows, error: rowsError } = await admin.from('collection_task_results')
        .select('item_index,raw_data').eq('task_id', taskId).eq('user_id', userId)
        .order('item_index', { ascending: true }).range(safeOffset, safeOffset + safeLimit - 1);
      if (rowsError) throw rowsError;
      return json({
        task, results: (rows ?? []).map(row => row.raw_data), indices: (rows ?? []).map(row => row.item_index),
        limit: safeLimit, offset: safeOffset, total: task.result_count ?? 0,
        synced: task.result_synced_count ?? 0, complete: (task.result_synced_count ?? 0) >= (task.result_count ?? 0),
      });
    }

    return json({error:'未知操作'},404);
  } catch (error) {
    return json({error:error instanceof Error?error.message:'服务器内部错误'},500);
  }
});
