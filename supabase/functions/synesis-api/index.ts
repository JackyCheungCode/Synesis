import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromB64 = (value: string) => Uint8Array.from(atob(value), c => c.charCodeAt(0));

function cloudflareModelPath(value: string): string {
  const model = value.trim();
  const segments = model.split('/');
  if (!model || segments.some(segment => !/^[A-Za-z0-9@._-]+$/.test(segment))) {
    throw new Error('Cloudflare 模型 ID 格式无效');
  }
  // Preserve namespace separators: Cloudflare routes model names as path segments.
  return segments.map(segment => encodeURIComponent(segment).replace(/%40/gi, '@')).join('/');
}
type ActorSchemaLookup = { schema: Record<string, unknown> | null; status: number; error?: string; buildId?: string };
async function readActorInputSchema(actorId: string, token: string, knownMeta?: Record<string, any>): Promise<ActorSchemaLookup> {
  const actorPath = actorId.replace('/', '~');
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  let meta = knownMeta;
  if (!meta) {
    const actorResponse = await fetch('https://api.apify.com/v2/actors/' + encodeURIComponent(actorPath), { headers });
    if (!actorResponse.ok) {
      const detail = await actorResponse.json().catch(() => ({}));
      const message = detail?.error?.message ?? detail?.message ?? '无法读取 Actor 详情';
      return { schema: null, status: actorResponse.status, error: 'Apify Actor 详情读取失败（HTTP ' + actorResponse.status + '）：' + message };
    }
    const actorPayload = await actorResponse.json().catch(() => ({}));
    meta = actorPayload?.data ?? actorPayload;
  }
  const preferredTag = String(meta?.defaultRunOptions?.build ?? 'latest');
  const buildId = meta?.taggedBuilds?.[preferredTag]?.buildId ?? meta?.taggedBuilds?.latest?.buildId;
  if (!buildId) return { schema: null, status: 422, error: '该 Actor 尚无可读取的默认构建（latest build），无法取得 Input Schema。可切换到高级 JSON 输入尝试运行。' };
  const buildResponse = await fetch('https://api.apify.com/v2/actor-builds/' + encodeURIComponent(String(buildId)), { headers });
  if (!buildResponse.ok) {
    const detail = await buildResponse.json().catch(() => ({}));
    const message = detail?.error?.message ?? detail?.message ?? '无法读取 Actor 构建定义';
    return { schema: null, status: buildResponse.status, error: 'Apify Actor Build 读取失败（HTTP ' + buildResponse.status + '）：' + message, buildId: String(buildId) };
  }
  const buildPayload = await buildResponse.json().catch(() => ({}));
  const build = buildPayload?.data ?? buildPayload;
  let schema = build?.actorDefinition?.input ?? build?.inputSchema ?? null;
  if (typeof schema === 'string') { try { schema = JSON.parse(schema); } catch { return { schema: null, status: 502, error: 'Apify 返回的 Input Schema 不是有效 JSON。', buildId: String(buildId) }; } }
  if (schema === null || schema === undefined) return { schema: null, status: 422, error: '该 Actor 的默认构建没有定义 Input Schema。可切换到高级 JSON 输入；Apify 会按 Actor 自身规则处理输入。', buildId: String(buildId) };
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return { schema: null, status: 502, error: 'Apify 返回的 Input Schema 格式无效。', buildId: String(buildId) };
  return { schema: schema as Record<string, unknown>, status: 200, buildId: String(buildId) };
}

type CompactInputSchema = { type?: string; properties?: Record<string,{type?:string|string[];minItems?:number;maxItems?:number;minLength?:number;maxLength?:number;minimum?:number;maximum?:number;pattern?:string;format?:string;items?:{type?:string;pattern?:string;format?:string};enum?:unknown[]}>; required?: string[] };
function validateActorInput(input: unknown, schema: CompactInputSchema): string[] {
  const errors:string[]=[];
  if(!input || typeof input!=='object' || Array.isArray(input)) return ['采集参数必须是 JSON 对象'];
  const value=input as Record<string,unknown>;
  const properties=schema.properties??{};
  for(const key of schema.required??[]) if(value[key]===undefined || value[key]===null || value[key]==='') errors.push(`缺少必填字段：${key}`);
  for(const [key,entry] of Object.entries(value)) {
    const definition=properties[key];
    if(!definition?.type) continue;
    const types=Array.isArray(definition.type)?definition.type:[definition.type];
    const valid=types.some(type=>{
      if(type==='null') return entry===null;
      if(type==='string') return typeof entry==='string';
      if(type==='number') return typeof entry==='number' && Number.isFinite(entry);
      if(type==='integer') return typeof entry==='number' && Number.isInteger(entry);
      if(type==='boolean') return typeof entry==='boolean';
      if(type==='object') return typeof entry==='object' && entry!==null && !Array.isArray(entry);
      if(type==='array') return Array.isArray(entry);
      return true;
    });
    if(!valid) errors.push(`字段 ${key} 类型不符合 Actor 输入规范（${types.join('|')}）`);
    if(Array.isArray(entry)) {
      if(definition.items?.type==='string') for(const [index,item] of entry.entries()) if(typeof item!=='string' || (typeof definition.items.pattern==='string' && (()=>{try{return !new RegExp(definition.items!.pattern!).test(String(item));}catch{return false;}})())) errors.push(`字段 ${key}[${index}] 不符合 Actor 要求的格式`);
      if(typeof definition.minItems==='number' && entry.length<definition.minItems) errors.push(`字段 ${key} 至少需要 ${definition.minItems} 个元素`);
      if(typeof definition.maxItems==='number' && entry.length>definition.maxItems) errors.push(`字段 ${key} 最多允许 ${definition.maxItems} 个元素`);
      if((schema.required??[]).includes(key) && entry.length===0) errors.push(`必填数组字段 ${key} 至少需要 1 个元素`);
    }
    if(typeof entry==='string') {
      if(typeof definition.pattern==='string') { try { if(!new RegExp(definition.pattern).test(entry)) errors.push(`字段 ${key} 不符合 Actor 要求的格式`); } catch { /* ignore invalid remote schema regex */ } }
      if(typeof definition.minLength==='number' && entry.length<definition.minLength) errors.push(`字段 ${key} 长度不能少于 ${definition.minLength}`);
      if(typeof definition.maxLength==='number' && entry.length>definition.maxLength) errors.push(`字段 ${key} 长度不能超过 ${definition.maxLength}`);
    }
    if(typeof entry==='number') {
      if(typeof definition.minimum==='number' && entry<definition.minimum) errors.push(`字段 ${key} 不能小于 ${definition.minimum}`);
      if(typeof definition.maximum==='number' && entry>definition.maximum) errors.push(`字段 ${key} 不能大于 ${definition.maximum}`);
    }
    if(Array.isArray(definition.enum) && !(Array.isArray(entry)?entry.every(value=>definition.enum!.some(option=>Object.is(option,value))):definition.enum.some(option=>Object.is(option,entry)))) errors.push(`字段 ${key} 不在 Actor 允许的枚举值内`);
  }
  return errors;
}

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

    if (action === 'models.list') {
      const slug = String(body.slug ?? '').trim();
      const supportedProviders = new Set(['openai','googlegemini','deepseek','anthropic','cloudflare','mistral','x']);
      if (!supportedProviders.has(slug)) return json({error:'不支持的 AI Provider'},400);
      const { config, clear } = await getCredential(slug,'provider');
      let endpoint = '';
      const headers:Record<string,string> = {};
      if (slug === 'openai') { endpoint = 'https://api.openai.com/v1/models'; headers.Authorization = `Bearer ${clear}`; }
      else if (slug === 'deepseek') { endpoint = 'https://api.deepseek.com/models'; headers.Authorization = `Bearer ${clear}`; }
      else if (slug === 'mistral') { endpoint = 'https://api.mistral.ai/v1/models'; headers.Authorization = `Bearer ${clear}`; }
      else if (slug === 'x') { endpoint = 'https://api.x.ai/v1/models'; headers.Authorization = `Bearer ${clear}`; }
      else if (slug === 'anthropic') { endpoint = 'https://api.anthropic.com/v1/models?limit=100'; headers['x-api-key'] = clear; headers['anthropic-version'] = '2023-06-01'; }
      else if (slug === 'googlegemini') endpoint = `https://generativelanguage.googleapis.com/v1beta/models?pageSize=100&key=${encodeURIComponent(clear)}`;
      else {
        if (!config.base_url) return json({error:'请先填写 Cloudflare Account ID'},400);
        endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(config.base_url)}/ai/models/search?per_page=100&hide_experimental=true`;
        headers.Authorization = `Bearer ${clear}`;
      }
      const upstream = await fetch(endpoint,{headers});
      if (!upstream.ok) {
        await admin.from('ai_provider_configs').update({connection_status:'error'}).eq('id',config.id).eq('user_id',userId);
        return json({error:`${config.display_name} 模型目录请求失败（HTTP ${upstream.status}），请检查 API Key 权限及账户配置。`},502);
      }
      const payload = await upstream.json();
      const rows = slug === 'googlegemini' ? (payload.models ?? []) : slug === 'cloudflare' ? (payload.result ?? []) : (payload.data ?? payload.models ?? []);
      const models = (Array.isArray(rows) ? rows : []).map((item:Record<string,unknown>) => {
        const rawId = String(slug === 'cloudflare' ? (item.name ?? item.model_id ?? item.id ?? '') : (item.id ?? item.name ?? item.model_id ?? '')).trim();
        const id = slug === 'googlegemini' ? rawId.replace(/^models\//,'') : rawId;
        if (!id) return null;
        const displayName = String(item.displayName ?? item.name ?? item.id ?? id).replace(/^models\//,'');
        const task = String(item.task ?? item.type ?? '');
        return {id,name:displayName, ...(task ? {task} : {})};
      }).filter((item):item is {id:string;name:string;task?:string} => Boolean(item))
        .filter((item,index,all)=>all.findIndex(other=>other.id===item.id)===index)
        .sort((a,b)=>a.name.localeCompare(b.name));
      await admin.from('ai_provider_configs').update({connection_status:'validated',last_validated_at:new Date().toISOString()}).eq('id',config.id).eq('user_id',userId);
      return json({models,selected_model:config.default_model ?? ''});
    }

    if (action === 'models.select') {
      const slug = String(body.slug ?? '').trim();
      const model = String(body.model ?? '').trim();
      if (!/^[a-z0-9_-]{2,48}$/.test(slug) || !model || model.length > 256) return json({error:'Provider 或模型参数无效'},400);
      const {data:config,error:configError} = await admin.from('ai_provider_configs').select('id').eq('user_id',userId).eq('provider_slug',slug).maybeSingle();
      if (configError || !config) return json({error:'找不到该 Provider 凭证配置'},404);
      const {error:updateError} = await admin.from('ai_provider_configs').update({default_model:model,updated_at:new Date().toISOString()}).eq('id',config.id).eq('user_id',userId);
      if (updateError) throw updateError;
      return json({ok:true,slug,selected_model:model});
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
          response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(config.base_url)}/ai/run/${cloudflareModelPath(model || config.default_model || '@cf/meta/llama-3.3-70b-instruct-fp8-fast')}`,{method:'POST',headers:{Authorization:`Bearer ${clear}`,'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:prompt}]})});
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
      const { config, clear } = await getCredential(provider,'provider');
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
        response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(config.base_url)}/ai/run/${cloudflareModelPath(model || config.default_model || '@cf/meta/llama-3.3-70b-instruct-fp8-fast')}`,{method:'POST',headers:{Authorization:`Bearer ${clear}`,'Content-Type':'application/json'},body:JSON.stringify({messages})});
      } else return json({error:'该模型路由暂不支持'},400);
      const result = await response.json();
      if (!response.ok) return json({error:result?.error?.message ?? '模型调用失败'},502);
      return json({result});
    }

    if (action === 'leads.actors.recommend') {
      const criteria=(body.criteria&&typeof body.criteria==='object'?body.criteria:{}) as Record<string,unknown>;
      const keywords=String(criteria.productKeywords??'').trim();
      const hsCodes=String(criteria.hsCodes??'').trim();
      if(!keywords&&!hsCodes) return json({error:'请至少填写产品关键词或 HS Code'},400);
      const candidates=[
        {id:'rich_minds/us-importer-finder-ai',reason:'面向美国进口商发现，支持产品关键词、HS Code 与进口来源条件；优先用于美国市场真实进口商线索。',base:98},
        {id:'fortuitous_pirate/bill-of-lading-scraper',reason:'基于提单数据按收货人（consignee）、发货人或货物描述搜索；适合验证进口行为与贸易关系。',base:94},
        {id:'automation-lab/importyeti-us-import-records',reason:'提取 ImportYeti 美国进口商、海外供应商、提单及 HS Code 相关记录。',base:91},
        {id:'akash9078/import-export-leads-finder',reason:'按国家与行业获取企业名录型线索；适合作为贸易记录之外的企业覆盖补充，不等同于真实进口记录。',base:72},
        {id:'flamboyant_liner/shipment-monitor',reason:'按进口商、HS Code 和货物关键词监控新提单；更适合持续监控已知客户，而非首次批量发现。',base:66},
        {id:'samstorm/lead-enrichment-actor',reason:'使用 Google Maps 业务类别与地点补充企业网站、邮箱及社交资料；属于联系方式补全，不是贸易记录来源。',base:55},
      ];
      const targetCountries=String(criteria.targetCountries??'').toLowerCase();
      const actors=await Promise.all(candidates.map(async candidate=>{
        const actorPath=candidate.id.replace('/','~');
        const headers:Record<string,string>={Accept:'application/json'};
        let token='';
        try { const credential=await getCredential('apify','integration'); token=credential.clear; headers.Authorization=`Bearer ${token}`; } catch { /* Recommendation metadata may be public; running still requires a configured token. */ }
        const metaResponse=await fetch(`https://api.apify.com/v2/actors/${encodeURIComponent(actorPath)}`,{headers});
        if(!metaResponse.ok) return null;
        const metaPayload=await metaResponse.json().catch(()=>({}));
        const meta=metaPayload?.data??metaPayload;
        if(!meta?.id||meta.isDeprecated) return null;
        const schemaResult=await readActorInputSchema(candidate.id,token,meta);
        const schema=schemaResult.schema;
        let score=candidate.base;
        const isUSMarket=/united states|usa|u\.s\.|(^|[,; ])us($|[,; ])/.test(targetCountries);
        const isOtherMarket=Boolean(targetCountries)&&!isUSMarket;
        if(candidate.id.includes('us-importer')||candidate.id.includes('bill-of-lading')||candidate.id.includes('importyeti')||candidate.id.includes('shipment-monitor')) {
          score+=isUSMarket?14:isOtherMarket?-28:0;
          if(/china|vietnam|india|thailand|taiwan/.test(String(criteria.originCountries??'').toLowerCase())) score+=1;
        }
        if(candidate.id.includes('import-export-leads-finder')&&isOtherMarket) score+=16;
        if(candidate.id.includes('lead-enrichment')&&(criteria.requireEmail||criteria.requirePhone||criteria.requireLinkedin)) score+=8;
        const requestedFields:Array<[string,boolean,RegExp]>=[
          ['产品关键词',Boolean(keywords),/keyword|product|cargo|searchquery/i],
          ['HS Code',Boolean(hsCodes),/hs.?code|watchHsCodes/i],
          ['目标进口国家',Boolean(criteria.targetCountries),/country|consignee|targetCountries/i],
          ['供应来源国家',Boolean(criteria.originCountries),/origin|shipper|source/i],
          ['进口日期范围',Boolean(criteria.shipmentDateFrom||criteria.shipmentDateTo),/date|start|end|from|to/i],
          ['最低进口次数',Boolean(criteria.minShipments),/shipment.*min|min.*shipment|count/i],
          ['进口货值范围',Boolean(criteria.minImportValue||criteria.maxImportValue),/value|amount|price/i],
          ['企业类型',Boolean(criteria.companyTypes),/company.?type|business.?type|sector/i],
          ['行业',Boolean(criteria.industries),/industry|sector/i],
          ['邮箱要求',Boolean(criteria.requireEmail),/email/i],
          ['电话要求',Boolean(criteria.requirePhone),/phone|telephone/i],
          ['网站要求',Boolean(criteria.requireWebsite),/website|domain|url/i],
          ['LinkedIn 要求',Boolean(criteria.requireLinkedin),/linkedin|social/i],
          ['采购决策人职位',Boolean(criteria.decisionMakerTitles),/title|job.?title|decision.?maker/i],
          ['已知进口商',Boolean(criteria.knownImporters),/consignee|importer|watchConsignees/i],
          ['已知供应商',Boolean(criteria.knownSuppliers),/shipper|supplier|watchShippers/i],
          ['目的港',Boolean(criteria.destinationPorts),/destination|arrival|discharge|port/i],
          ['起运港',Boolean(criteria.originPorts),/origin|loading|port/i],
          ['排除关键词',Boolean(criteria.excludeKeywords),/exclude|excludeTerms|negative/i],
          ['企业员工规模',Boolean(criteria.employeeRange),/employee|staff|companySize/i],
          ['最大结果数',Boolean(criteria.maxResults),/maxResults|maxLeads|limit|count/i],
        ].filter(([,active])=>active);
        const explicitMappings:Record<string,Array<[string,string]>>={
          'fortuitous_pirate/bill-of-lading-scraper':[['产品关键词','searchQuery'],['HS Code','searchQuery']],
          'flamboyant_liner/shipment-monitor':[['HS Code','watchHsCodes'],['产品关键词','productKeywords'],['已知进口商','watchConsignees'],['已知供应商','watchShippers']],
          'akash9078/import-export-leads-finder':[['目标进口国家','country'],['行业','sector'],['最大结果数','maxLeads']],
        };
        const mapped=explicitMappings[candidate.id]??[];
        const schemaProperties=(schema as any)?.properties??{};
        const supportedFields=mapped.filter(([label,property])=>requestedFields.some(([requested])=>requested===label)&&Object.prototype.hasOwnProperty.call(schemaProperties,property)).map(([label])=>label);
        const unsupportedFields=requestedFields.map(([label])=>label).filter(label=>!supportedFields.includes(label));
        return {
          actor_id:candidate.id,title:String(meta.title??meta.name??candidate.id),description:String(meta.description??'').slice(0,700),
          score:Math.min(99,score+supportedFields.length*2),recommendation_reason:candidate.reason,
          supported_fields:supportedFields,unsupported_fields:unsupportedFields,
          input_schema:schema, schema_error:schemaResult.error??null, schema_status:schemaResult.status, schema_build_id:schemaResult.buildId??null,
          stats:meta.stats??null,
        };
      }));
      const available=actors.filter(Boolean).sort((a:any,b:any)=>b.score-a.score);
      return json({actors:available,criteria_received:{product_keywords:Boolean(keywords),hs_codes:Boolean(hsCodes),target_countries:Boolean(targetCountries)},apify_configured:Boolean((await admin.from('integration_connections').select('id').eq('user_id',userId).eq('service_slug','apify').maybeSingle()).data)});
    }

    if (action === 'leads.actor.schema') {
      const actorId=String(body.actorId??'').trim();
      if(!/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/.test(actorId)) return json({error:'Actor ID 格式无效'},400);
      const {clear:apifyToken}=await getCredential('apify','integration');
      const lookup=await readActorInputSchema(actorId,apifyToken);
      if(!lookup.schema) return json({error:lookup.error??'Actor Input Schema 不可用',code:'ACTOR_INPUT_SCHEMA_UNAVAILABLE',upstream_status:lookup.status},lookup.status);
      const schema=lookup.schema;
      const serialized=JSON.stringify(schema);
      const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(serialized));
      const schemaHash=Array.from(new Uint8Array(digest)).map(byte=>byte.toString(16).padStart(2,'0')).join('');
      return json({actor_id:actorId,schema,schema_hash:schemaHash,build_id:lookup.buildId??null,fetched_at:new Date().toISOString()});
    }

    if (action === 'leads.run') {
      const actorId=String(body.actorId??'').trim();
      const input=body.input;
      if(!/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/.test(actorId)) return json({error:'Actor ID 格式无效'},400);
      const {clear:apifyToken}=await getCredential('apify','integration');
      const lookup=await readActorInputSchema(actorId,apifyToken);
      if(!lookup.schema && lookup.status!==422) return json({error:lookup.error??'无法读取 Actor Input Schema',code:'ACTOR_INPUT_SCHEMA_UNAVAILABLE',upstream_status:lookup.status},lookup.status);
      const schema=(lookup.schema??{}) as CompactInputSchema;
      const validation=validateActorInput(input,schema);
      if(validation.length) return json({error:'Actor 输入参数未通过 Schema 校验',validation},400);
      const response=await fetch(`https://api.apify.com/v2/acts/${actorPath}/runs?waitForFinish=0`,{
        method:'POST',headers:{Authorization:`Bearer ${apifyToken}`,'Content-Type':'application/json'},
        body:JSON.stringify(input),
      });
      const payload=await response.json().catch(()=>({}));
      if(!response.ok||!payload?.data?.id) return json({error:payload?.error?.message??payload?.message??`Apify Actor 启动失败（HTTP ${response.status}）`},502);
      return json({run:payload.data,items:[],actor_id:actorId});
    }

    if (action === 'leads.results') {
      const runId=String(body.runId??'').trim();
      if(!/^[a-zA-Z0-9_-]{5,100}$/.test(runId)) return json({error:'Apify Run ID 格式无效'},400);
      const {clear:apifyToken}=await getCredential('apify','integration');
      const runResponse=await fetch(`https://api.apify.com/v2/actor-runs/${encodeURIComponent(runId)}`,{headers:{Authorization:`Bearer ${apifyToken}`}});
      const runPayload=await runResponse.json().catch(()=>({}));
      if(!runResponse.ok||!runPayload?.data) return json({error:`读取 Apify Run 失败（HTTP ${runResponse.status}）`},502);
      const run=runPayload.data;
      let items:unknown[]=[];
      if(run.status==='SUCCEEDED'&&run.defaultDatasetId){
        const resultResponse=await fetch(`https://api.apify.com/v2/datasets/${encodeURIComponent(run.defaultDatasetId)}/items?clean=true&format=json&limit=1000`,{headers:{Authorization:`Bearer ${apifyToken}`}});
        if(!resultResponse.ok) return json({error:`读取 Actor 结果集失败（HTTP ${resultResponse.status}）`},502);
        const resultPayload=await resultResponse.json().catch(()=>[]);
        items=Array.isArray(resultPayload)?resultPayload:[];
      }
      return json({run,items});
    }

    return json({error:'未知操作'},404);
  } catch (error) {
    return json({error:error instanceof Error?error.message:'服务器内部错误'},500);
  }
});
