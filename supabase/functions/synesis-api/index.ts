import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { readField, resolveProductIdentity, normalizeResearchRecord } from './product-identity.js';

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

function parseJsonObject(raw: string): Record<string, unknown> {
  const text = raw.trim().replace(/^\uFEFF/, '');
  const candidates = [text, text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()];
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    } catch { /* Try extracting a JSON object from surrounding prose. */ }
  }
  // Find the first balanced JSON object while respecting quoted strings and escapes.
  for (let start = text.indexOf('{'); start >= 0; start = text.indexOf('{', start + 1)) {
    let depth = 0, quoted = false, escaped = false;
    for (let i = start; i < text.length; i++) {
      const char = text[i];
      if (quoted) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') quoted = false;
        continue;
      }
      if (char === '"') quoted = true;
      else if (char === '{') depth++;
      else if (char === '}' && --depth === 0) {
        try {
          const parsed = JSON.parse(text.slice(start, i + 1));
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
        } catch { break; }
      }
    }
  }
  throw new Error('AI 返回内容中没有可解析的 JSON 对象');
}

type CompactInputSchema = { type?: string; properties?: Record<string,{type?:string|string[];minItems?:number;maxItems?:number;minLength?:number;maxLength?:number;minimum?:number;maximum?:number;pattern?:string;format?:string;items?:{type?:string;pattern?:string;format?:string};enum?:unknown[]}>; required?: string[] };
function normalizeAmazonActorInput(actorId:string, raw:unknown):Record<string,unknown> {
  const input:Record<string,unknown>=raw&&typeof raw==='object'&&!Array.isArray(raw)?{...(raw as Record<string,unknown>)}:{};
  const toUrlObjects=(field:string)=>{
    if(!Array.isArray(input[field])) return;
    input[field]=(input[field] as unknown[]).map(value=>{
      if(typeof value==='string') return {url:value.trim()};
      if(value&&typeof value==='object'&&!Array.isArray(value)) {
        const item=value as Record<string,unknown>;
        return typeof item.url==='string'?{...item,url:item.url.trim()}:item;
      }
      return value;
    });
  };
  if(actorId==='BG3WDrGdteHgZgbPK') {
    toUrlObjects('categoryOrProductUrls');
    const language=String(input.language??'en').trim();
    const aliases:Record<string,string>={english:'en',chinese:'zh_CN','traditional chinese':'zh_TW','simplified chinese':'zh_CN',japanese:'ja',korean:'ko'};
    const allowed=['cs','da','de','en','es','fr','nl','pl','pt','sv','tr','he','ar','mrta','hi','bn','ta','te','kn','ml','ko','zh_CN','zh_TW','ja'];
    const normalized=aliases[language.toLowerCase()]??language;
    input.language=allowed.includes(normalized)?normalized:'en';
    const proxy=String(input.proxyCountry??'').trim().toLowerCase();
    if(proxy==='australia') input.proxyCountry='AU';
    if(proxy==='united states'||proxy==='usa') input.proxyCountry='US';
  }
  if(actorId==='R8WeJwLuzLZ6g4Bkk') {
    toUrlObjects('productUrls');
    if(!['helpful','recent'].includes(String(input.sort??''))) input.sort='helpful';
    const cutoff=String(input.reviewsCutoffDate??'');
    const cutoffPattern=/^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])(T[0-2]\d:[0-5]\d(:[0-5]\d)?(\.\d+)?Z?)?$|^(\d+)\s*(minute|hour|day|week|month|year)s?$/;
    if(!cutoffPattern.test(cutoff)) input.reviewsCutoffDate='1 year';
  }
  return input;
}

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

    if (action === 'research.parse') {
      const { brief, provider } = body;
      if (typeof brief !== 'string' || !brief.trim() || brief.length > 16000) return json({error:'研究需求不能为空，且最多 16,000 个字符'},400);
      if (typeof provider !== 'string' || !/^[a-z0-9_-]{2,48}$/.test(provider)) return json({error:'AI Provider 参数无效'},400);
      const { config, clear } = await getCredential(provider,'provider');
      const fields = [
        ['keywords','核心关键词'],['languages','研究语言'],['countries','目标国家'],['regions','目标地区'],
        ['time_range','研究时间范围'],['product_categories','产品类别'],['product_attributes','产品属性与规格'],
        ['brands','品牌'],['models_identifiers','产品型号与标识符'],['price_range','价格范围与币种'],
        ['usage_scenarios','使用场景'],['certifications','认证与合规要求'],['target_customers','目标客户群体'],
        ['sales_channels','销售渠道'],['competitors','竞争对手'],['reference_urls','参考 URL 与账号'],
        ['origin_supply_markets','原产地与供应链市场'],['logistics_attributes','包装与物流属性'],
        ['exclusions','排除条件'],['purchase_requirements','采购数量与成本要求'],
        ['business_goals','商业目标与研究问题'],['other_constraints','其他约束条件'],
      ] as const;
      const system = 'You are the structured research-intake analyst for Synesis, a global cross-border business intelligence platform. Analyze the user brief and return valid JSON only. Shape: {summary:string, dimensions:[{key:string,label:string,values:string[],status:"provided"|"suggested"|"needs_confirmation",note?:string}], research_goals:string[], assumptions:string[], missing_information:string[]}. Return one dimension for EVERY supplied key, preserving its exact key and label. "provided" means explicitly present in the user text; "suggested" means a clearly useful AI proposal that is not a fact and must be visibly marked as a suggestion; "needs_confirmation" means absent or ambiguous and values must be empty. Never invent countries, brands, product specifications, prices, dates, URLs, customer attributes, market facts, or competitors. Expand keywords with translations/synonyms only as suggestions and label their language. Keep user-provided URLs exactly. Separate countries from subnational regions. Parse units and currency literally. Do not infer protected or sensitive personal traits. research_goals should reflect explicit goals and may include clearly labeled suggested goals. assumptions and missing_information must be concise. Values should be short strings, not paragraphs. Do not treat a generic example in the prompt as user data.';
      const prompt = JSON.stringify({user_brief:brief,required_dimensions:fields.map(([key,label])=>({key,label}))});
      const model=String(config.default_model||'').trim();
      async function requestResearchText(userPrompt:string):Promise<{raw:string;result:any}> {
        let response:Response;
        if (provider==='openai'||provider==='deepseek'||provider==='mistral'||provider==='x') {
          const base=provider==='openai'?'https://api.openai.com/v1':provider==='deepseek'?'https://api.deepseek.com':provider==='mistral'?'https://api.mistral.ai/v1':'https://api.x.ai/v1';
          const selectedModel=model||(provider==='openai'?'gpt-4.1-mini':provider==='deepseek'?'deepseek-chat':provider==='mistral'?'mistral-small-latest':'grok-3-mini');
          response=await fetch(`${base}/chat/completions`,{method:'POST',headers:{Authorization:`Bearer ${clear}`,'Content-Type':'application/json'},body:JSON.stringify({model:selectedModel,messages:[{role:'system',content:system},{role:'user',content:userPrompt}],response_format:{type:'json_object'},max_tokens:8000})});
        } else if(provider==='googlegemini') {
          response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model||'gemini-2.5-flash'}:generateContent?key=${encodeURIComponent(clear)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents:[{parts:[{text:userPrompt}]}],generationConfig:{responseMimeType:'application/json',maxOutputTokens:8000}})});
        } else if(provider==='anthropic') {
          response=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'x-api-key':clear,'anthropic-version':'2023-06-01','content-type':'application/json'},body:JSON.stringify({model:model||'claude-3-7-sonnet-latest',max_tokens:8000,system,messages:[{role:'user',content:userPrompt}]})});
        } else if(provider==='cloudflare') {
          if(!config.base_url) throw new Error('请先配置 Cloudflare Account ID');
          response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(config.base_url)}/ai/run/${cloudflareModelPath(model||'@cf/meta/llama-3.3-70b-instruct-fp8-fast')}`,{method:'POST',headers:{Authorization:`Bearer ${clear}`,'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'system',content:system},{role:'user',content:userPrompt}],max_tokens:8000})});
        } else throw new Error('该 AI Provider 暂不支持研究需求解析');
        const responseText=await response.text();
        let result:any={};
        try { result=JSON.parse(responseText); } catch { result={raw_response:responseText}; }
        if(!response.ok) {
          const detail=result?.error?.message??result?.message??result?.detail??responseText.slice(0,500);
          throw new Error(`AI Provider（${provider}）请求失败，HTTP ${response.status}：${String(detail).slice(0,500)}`);
        }
        const raw=provider==='googlegemini'?result.candidates?.[0]?.content?.parts?.map((part:any)=>part.text??'').join(''):provider==='anthropic'?result.content?.filter((part:any)=>part.type==='text').map((part:any)=>part.text).join(''):provider==='cloudflare'?result.result?.response:result.choices?.[0]?.message?.content;
        if(typeof raw!=='string'||!raw.trim()) {
          const reason=result?.promptFeedback?.blockReason??result?.candidates?.[0]?.finishReason??result?.stop_reason??'响应中没有可用的文本内容';
          throw new Error(`AI Provider（${provider}）未返回需求解析文本：${String(reason).slice(0,200)}`);
        }
        return {raw,result};
      }
      let first=await requestResearchText(prompt);
      let parsed:Record<string,unknown>;
      try {
        parsed=parseJsonObject(first.raw);
      } catch {
        // A second, constrained repair pass handles markdown fences, preambles and malformed/truncated JSON.
        const repairPrompt=JSON.stringify({
          task:'Repair the following model output into one complete valid JSON object. Do not add facts. Preserve all supplied information. Return JSON only, without markdown fences or commentary.',
          required_shape:{summary:'string',dimensions:fields.map(([key,label])=>({key,label,values:['string'],status:'provided|suggested|needs_confirmation',note:'optional string'})),research_goals:['string'],assumptions:['string'],missing_information:['string']},
          invalid_output:first.raw.slice(0,24000)
        });
        const repaired=await requestResearchText(repairPrompt);
        try { parsed=parseJsonObject(repaired.raw); }
        catch {
          const finish=first.result?.candidates?.[0]?.finishReason??first.result?.stop_reason??'unknown';
          throw new Error(`AI（${provider}）两次输出均无法解析为 JSON；首次结束状态：${String(finish)}。请稍后重试或切换模型。`);
        }
      }
      if(!Array.isArray(parsed.dimensions)) throw new Error(`AI（${provider}）返回的 JSON 缺少 dimensions 数组，请重新解析。`);
      const returned=Array.isArray(parsed.dimensions)?parsed.dimensions as Record<string,unknown>[]:[];
      const byKey=new Map(returned.filter(item=>typeof item.key==='string').map(item=>[String(item.key),item]));
      const dimensions=fields.map(([key,label])=>{
        const item=byKey.get(key);
        const rawStatus=String(item?.status??'needs_confirmation');
        const status=['provided','suggested','needs_confirmation'].includes(rawStatus)?rawStatus:'needs_confirmation';
        const values=Array.isArray(item?.values)?item!.values.filter((value):value is string=>typeof value==='string').map(value=>value.trim()).filter(Boolean).slice(0,30):[];
        return {key,label,values:status==='needs_confirmation'?[]:values,status:status==='needs_confirmation'||!values.length?'needs_confirmation':status,note:typeof item?.note==='string'?item.note.slice(0,500):undefined};
      });
      for(const item of returned) {
        const key=String(item.key??'');
        if(!key||fields.some(field=>field[0]===key)||!/^custom_[a-z0-9_-]{1,40}$/.test(key)) continue;
        const values=Array.isArray(item.values)?item.values.filter((value):value is string=>typeof value==='string').map(value=>value.trim()).filter(Boolean).slice(0,30):[];
        dimensions.push({key,label:typeof item.label==='string'?item.label.slice(0,80):key,values,status:'suggested',note:typeof item.note==='string'?item.note.slice(0,500):undefined});
      }
      const asStringArray=(value:unknown)=>Array.isArray(value)?value.filter((item):item is string=>typeof item==='string').map(item=>item.trim()).filter(Boolean).slice(0,30):[];
      const profile={
        summary:typeof parsed.summary==='string'?parsed.summary.slice(0,1000):'已完成研究需求结构化解析，请检查各维度。',
        dimensions,
        research_goals:asStringArray(parsed.research_goals),
        assumptions:asStringArray(parsed.assumptions),
        missing_information:asStringArray(parsed.missing_information),
      };
      return json({ok:true,profile});
    }

    if (action === 'plans.generate') {
      const { projectId, provider } = body;
      const { data: project, error: projectError } = await admin.from('research_projects').select('*').eq('id',projectId).eq('user_id',userId).single();
      if (projectError || !project) throw new Error('研究项目不存在');
      const { clear } = await getCredential(provider,'provider');

      // Discover real Store Actors with compact input schemas; never ask the model to invent IDs.
      const objective=String(project.objective??'').trim();
      const selectedPlatforms=Array.isArray((project.scope as Record<string,unknown>|null)?.selected_data_sources)
        ?((project.scope as Record<string,unknown>).selected_data_sources as unknown[]).filter((value):value is string=>typeof value==='string'&&value.trim().length>0)
        :[];
      const knownPlatforms=[
        ['amazon',/amazon|亚马逊/i],['ebay',/ebay/i],['walmart',/walmart/i],
        ['alibaba',/alibaba|阿里巴巴|1688/i],['aliexpress',/aliexpress|速卖通/i],['etsy',/etsy/i],
        ['tiktok',/tiktok|抖音/i],['instagram',/instagram/i],['facebook',/facebook/i],
        ['pinterest',/pinterest/i],['reddit',/reddit/i],['youtube',/youtube|油管/i],
        ['google',/google|谷歌/i],['bing',/bing/i],['shopify',/shopify/i],
        ['shopee',/shopee/i],['lazada',/lazada/i],['temu',/temu/i],
        ['x-twitter',/x \/ twitter|twitter/i],['linkedin',/linkedin/i],['threads',/threads/i],
        ['douyin',/douyin|抖音/i],['xiaohongshu',/xiaohongshu|小红书|rednote/i],
        ['weibo',/weibo|微博/i],['bilibili',/bilibili|哔哩哔哩/i],['baidu',/baidu|百度/i],
        ['naver',/naver/i],['crunchbase',/crunchbase/i],['indeed',/indeed/i],
        ['glassdoor',/glassdoor/i],['zillow',/zillow/i],['airbnb',/airbnb/i],
        ['booking',/booking\.com/i],['yelp',/yelp/i],['google-play',/google play/i],
        ['app-store',/apple app store|app store/i],['sec-edgar',/sec edgar/i],
      ] as const;
      const mentioned=knownPlatforms.filter(([,pattern])=>pattern.test(objective)).map(([slug])=>slug);
      const categoryTerms=[
        [/社交媒体|social media/i,'social media scraper'],
        [/搜索引擎|search engine|购物搜索/i,'search engine results scraper'],
        [/商品评价|消费者反馈|reviews|评论/i,'product reviews scraper'],
        [/供应商|制造商|企业目录|supplier/i,'supplier directory scraper'],
        [/广告与市场趋势|广告素材|趋势关键词|advertising/i,'public ads trends scraper'],
        [/独立站|品牌官网|shopify|brand website/i,'ecommerce website scraper'],
        [/全球电商|电商平台|ecommerce/i,'ecommerce product scraper'],
        [/行业数据|行业目录|贸易信息/i,'industry directory data scraper'],
      ].filter(([pattern])=>(pattern as RegExp).test(objective)).map(([,term])=>String(term));
      const platformTerms=selectedPlatforms.map(platform=>platform+' scraper');
      const searchTerms=[...new Set([...platformTerms,...mentioned.map(slug=>slug+' scraper'),...categoryTerms])].slice(0,30);
      if(!searchTerms.length) searchTerms.push('ecommerce product scraper','product reviews scraper','market research data scraper');
      const actorMap=new Map<string,Record<string,unknown>>();
      for(let offset=0;offset<searchTerms.length;offset+=6) {
        const batch=await Promise.all(searchTerms.slice(offset,offset+6).map(async term=>{
          try {
            const query=new URLSearchParams({search:term,limit:'10',includeInputSchema:'true'});
            const storeResponse=await fetch(`https://api.apify.com/v2/store?${query.toString()}`);
            if(!storeResponse.ok) return [];
            const storePayload=await storeResponse.json().catch(()=>({}));
            return (storePayload?.data?.items??[]) as Record<string,unknown>[];
          } catch { return []; }
        }));
        for(const actors of batch) for(const actor of actors.slice(0,2)) {
          const schema=actor.inputSchema as CompactInputSchema|undefined;
          if(typeof actor.id!=='string' || !schema || schema.type!=='object' || !schema.properties || actor.notice==='UNDER_MAINTENANCE') continue;
          actorMap.set(actor.id,{
            id:actor.id,title:actor.title??actor.name,username:actor.username,name:actor.name,
            description:actor.description,categories:actor.categories,
            rating:(actor.stats as Record<string,unknown>|undefined)?.actorReviewRating,
            pricing_model:(actor.currentPricingInfo as Record<string,unknown>|undefined)?.pricingModel,
            input_schema:schema,
          });
        }
      }
      const actorCandidates=[...actorMap.values()].slice(0,60);
      const system = 'You are Synesis global trade research planner. Return valid JSON only with keys: executive_summary, research_questions (array), platform_tasks (array of objects {platform_slug, actor_id, input, purpose, estimated_items, estimated_cost_usd}), methodology, deliverables, estimated_cost_usd. Select Actors ONLY from the supplied actor_candidates and copy the exact candidate id. Never invent an Actor ID. Construct input using only fields and types in that candidate input_schema, and include all required fields. Read project.scope.collection_settings: target itemsPerPlatform is the requested record count PER PLATFORM (not a shared total); set estimated_items to that target and map it to the correct limit/count/maxResults/page-size input field only when that field exists in the selected Actor schema. Map depth light to list/core fields, standard to core fields plus available key engagement/rating/basic detail fields, and deep to detail pages, comments, and related records only when the Actor schema explicitly supports them. Never invent unsupported input fields or exceed the Actor schema. Create a separate platform_task for every selected platform in project.scope.selected_data_sources whenever a matching Actor candidate exists; do not collapse different selected platforms into one task unless the candidate explicitly supports all of them. If a platform has no suitable candidate or its schema cannot support a requested depth, still explain the limitation and collect the useful supported fields; do not silently omit a selected platform. If no candidate is genuinely suitable or required fields cannot be satisfied, omit that platform task and explain the gap in research_questions or methodology. Tasks are proposed only, not executed.';
      const prompt = JSON.stringify({project,actor_candidates:actorCandidates});
      let response: Response;
      let cloudflareModel='';
      let cloudflareAccountId='';
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
        cloudflareAccountId=config.base_url;
        cloudflareModel=config.default_model || '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
        response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(cloudflareAccountId)}/ai/run/${cloudflareModelPath(cloudflareModel)}`,{method:'POST',headers:{Authorization:`Bearer ${clear}`,'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'system',content:system},{role:'user',content:prompt}],max_tokens:8000})});
      } else throw new Error('该 Provider 暂不支持计划生成');
      const responseText=await response.text();
      let result:Record<string,any>={};
      try { result=JSON.parse(responseText); }
      catch {
        if(!response.ok) throw new Error(`AI Provider 请求失败（${provider}，HTTP ${response.status}）：${responseText.slice(0,400)||'服务未返回错误详情'}`);
        throw new Error(`AI Provider（${provider}）返回了无法解析的响应，请检查模型与接口兼容性`);
      }
      const providerError=[
        result?.error?.message,
        result?.message,
        Array.isArray(result?.errors)?result.errors.map((item:Record<string,unknown>)=>item?.message??item?.code).filter(Boolean).join('；'):'',
        result?.detail,
      ].find(value=>typeof value==='string'&&value.trim());
      if(!response.ok || result?.success===false) {
        const detail=String(providerError??'服务未提供具体错误信息').slice(0,500);
        throw new Error(`AI Provider 请求失败（${provider}，HTTP ${response.status}）：${detail}`);
      }
      const raw=provider==='googlegemini'?result.candidates?.[0]?.content?.parts?.[0]?.text:provider==='anthropic'?result.content?.[0]?.text:provider==='cloudflare'?result.result?.response:result.choices?.[0]?.message?.content;
      if(typeof raw!=='string'||!raw.trim()) {
        const reason=result?.promptFeedback?.blockReason??result?.candidates?.[0]?.finishReason??result?.stop_reason??'响应中没有可用的文本内容';
        throw new Error(`AI Provider（${provider}）未返回计划文本：${String(reason).slice(0,200)}`);
      }
      let plan:Record<string,any>;
      try {
        plan=parseJsonObject(raw);
      } catch {
        if(provider!=='cloudflare') throw new Error(`AI Provider（${provider}）返回的计划无法解析为 JSON，请稍后重试或更换模型。`);
        const repairPrompt=JSON.stringify({
          task:'Repair the model output into one complete valid JSON object. Return JSON only, without markdown fences or commentary. Do not add or invent facts, actor IDs, platform tasks, or schema fields. Preserve exact Actor IDs only from the supplied candidate list.',
          required_shape:{executive_summary:'string',research_questions:['string'],platform_tasks:[{platform_slug:'string',actor_id:'string',input:'object',purpose:'string',estimated_items:'number',estimated_cost_usd:'number'}],methodology:'string',deliverables:['string'],estimated_cost_usd:'number'},
          original_task:prompt,
          invalid_output:raw.slice(0,24000),
        });
        const repairResponse=await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(cloudflareAccountId)}/ai/run/${cloudflareModelPath(cloudflareModel)}`,{method:'POST',headers:{Authorization:`Bearer ${clear}`,'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'system',content:'You are a strict JSON repair tool. Output one valid JSON object only.'},{role:'user',content:repairPrompt}],max_tokens:8000})});
        const repairText=await repairResponse.text();
        let repairResult:Record<string,any>={};
        try { repairResult=JSON.parse(repairText); } catch { /* handled below */ }
        if(!repairResponse.ok || repairResult?.success===false) {
          const detail=repairResult?.errors?.map((item:Record<string,unknown>)=>item?.message??item?.code).filter(Boolean).join('；')??'模型修复请求失败';
          throw new Error(`Cloudflare 计划 JSON 自动修复失败（HTTP ${repairResponse.status}）：${String(detail).slice(0,300)}`);
        }
        const repairedRaw=repairResult?.result?.response;
        if(typeof repairedRaw!=='string'||!repairedRaw.trim()) throw new Error('Cloudflare 模型修复后仍未返回计划文本，请检查所选模型的文本生成能力。');
        try { plan=parseJsonObject(repairedRaw); }
        catch { throw new Error('Cloudflare 模型两次输出均无法解析为完整 JSON。请在 AI 模型管理中选择支持较长结构化输出的模型后重试。'); }
      }
      if(!Array.isArray(plan.research_questions)||!Array.isArray(plan.platform_tasks)||!Array.isArray(plan.deliverables)) {
        throw new Error('AI 返回的研究计划结构不完整（缺少 research_questions、platform_tasks 或 deliverables 数组），请重试。');
      }
      const candidateById=new Map(actorCandidates.map(actor=>[String(actor.id),actor]));
      const platformTasks=Array.isArray(plan.platform_tasks)?plan.platform_tasks:[];
      const projectScope=(project.scope as Record<string,any>|null)??{};
      const collectionSettings=projectScope.collection_settings??{};
      const dimensions=Array.isArray(projectScope.research_profile?.dimensions)?projectScope.research_profile.dimensions:[];
      const keywordDimension=dimensions.find((dimension:Record<string,any>)=>String(dimension.key??'').toLowerCase()==='keywords');
      const researchKeywords=(Array.isArray(keywordDimension?.values)?keywordDimension.values:[])
        .filter((value:unknown)=>typeof value==='string'&&value.trim()).map((value:string)=>value.trim()).slice(0,10);
      if(!researchKeywords.length) {
        const keywordMatch=String(projectScope.original_brief??project.objective??'').match(/(?:核心关键词|关键词|keywords?)\s*[:：]\s*([^\n]+)/i);
        if(keywordMatch) researchKeywords.push(...keywordMatch[1].split(/[，,;；]/).map((value:string)=>value.trim()).filter(Boolean).slice(0,10));
      }
      const requestedItems=Math.min(5000,Math.max(10,Number(collectionSettings.itemsPerPlatform)||100));
      const requestedDepth=collectionSettings.depth==='light'||collectionSettings.depth==='deep'?collectionSettings.depth:'standard';
      const countFieldPriority=['maxItems','maxResults','maxResultsPerSearch','resultsLimit','limit','itemLimit','itemsLimit','maxRecords','recordLimit','numberOfResults','numResults','maxProducts','maxVideos','maxPosts','maxListings','count'];
      plan.platform_tasks=platformTasks.map((task:Record<string,unknown>)=>{
        const candidate=typeof task.actor_id==='string'?candidateById.get(task.actor_id):undefined;
        if(!candidate) return {...task,actor_id:null,schema_valid:false,validation_errors:['未从 Apify Store 的候选 Actor 中选择有效 Actor']};
        const schema=candidate.input_schema as CompactInputSchema;
        const properties=schema.properties??{};
        const input=task.input&&typeof task.input==='object'&&!Array.isArray(task.input)?{...(task.input as Record<string,unknown>)}:{};
        const settingsWarnings:string[]=[];
        if(String(task.platform_slug??'').toLowerCase()==='amazon') {
          const cutoffDefinition=properties.reviewsCutoffDate;
          if(cutoffDefinition) {
            const cutoffPattern=typeof cutoffDefinition.pattern==='string'?new RegExp(cutoffDefinition.pattern):/^(\\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])(T[0-2]\\d:[0-5]\\d(:[0-5]\\d)?(\\.\\d+)?Z?)?$|^(\\d+)\\s*(minute|hour|day|week|month|year)s?$/;
            if(typeof input.reviewsCutoffDate!=='string' || !cutoffPattern.test(input.reviewsCutoffDate)) {
              input.reviewsCutoffDate=cutoffPattern.test('1 year')?'1 year':new Date().toISOString().slice(0,10);
              settingsWarnings.push('reviewsCutoffDate 格式已自动规范为 Apify 支持的相对时间/日期格式。');
            }
          }
          const productUrlsDefinition=properties.productUrls;
          if(productUrlsDefinition) {
            const originalProductUrls=Array.isArray(input.productUrls)?input.productUrls:[];
            const urlPattern=typeof productUrlsDefinition.items?.pattern==='string'?new RegExp(productUrlsDefinition.items.pattern):null;
            const validProductUrls=(input.productUrls as unknown[]).filter((value):value is string=>{
              if(typeof value!=='string') return false;
              try { const parsed=new URL(value); return (parsed.protocol==='https:'||parsed.protocol==='http:')&&(!urlPattern||urlPattern.test(value)); } catch { return false; }
            });
            if(validProductUrls.length!==originalProductUrls.length) settingsWarnings.push('已移除不符合 Actor URL 规范的 productUrls 条目。');
            input.productUrls=validProductUrls;
            if(validProductUrls.length===0 && researchKeywords.length) {
              const generated=researchKeywords.map(keyword=>`https://www.amazon.com/s?k=${encodeURIComponent(keyword)}`);
              const compatible=generated.filter(value=>{try{return !urlPattern||urlPattern.test(value);}catch{return false;}});
              if(compatible.length) {
                input.productUrls=compatible;
                settingsWarnings.push('Actor 的 productUrls 为空或无效；已使用 Amazon 搜索入口补齐 URL。');
              }
            }
          }
        }
        if(String(task.platform_slug??'').toLowerCase()==='amazon'&&researchKeywords.length) {
          const amazonUrlField=['categoryOrProductUrls','startUrls','urls'].find(name=>{
            const fieldType=properties[name]?.type;
            return (Array.isArray(fieldType)?fieldType:[fieldType]).includes('array');
          });
          if(amazonUrlField&&(!Array.isArray(input[amazonUrlField])||(input[amazonUrlField] as unknown[]).length===0)) {
            input[amazonUrlField]=researchKeywords.map(keyword=>`https://www.amazon.com/s?k=${encodeURIComponent(keyword)}`);
            settingsWarnings.push('Actor 未收到商品或分类 URL；系统已根据核心关键词生成 Amazon.com 搜索入口。目标国家若无 Amazon 本地站点，结果可能不代表当地站点库存与价格。');
          }
        }
        const numericFields=Object.entries(properties).filter(([,definition])=>(Array.isArray(definition?.type)?definition.type:[definition?.type]).some(type=>type==='number'||type==='integer'));
        const countField=countFieldPriority.find(key=>numericFields.some(([name])=>name.toLowerCase()===key.toLowerCase()))
          ??numericFields.find(([name])=>/(limit|max(items|results|records|products|videos|posts|listings)|numberofresults|numresults|^count$)/i.test(name))?.[0];
        if(countField) input[countField]=requestedItems;
        else settingsWarnings.push('该 Actor Schema 未发现明确的记录数量参数，目标数量可能无法由 Actor 强制限制。');
        const depthFields=Object.entries(properties).filter(([name,definition])=>(Array.isArray(definition?.type)?definition.type:[definition?.type]).includes('boolean')&&/(include|enable|fetch|get|scrape|with).*(comments?|reviews?|replies|details?)|(comments?|reviews?|replies|details?).*(enabled|included)/i.test(name));
        if(requestedDepth==='deep') {
          if(depthFields.length) for(const [name] of depthFields) input[name]=true;
          else settingsWarnings.push('该 Actor Schema 未提供评论、详情或关联内容开关，深度采集将受平台能力限制。');
        }
        const validationErrors=validateActorInput(input,schema);
        return {
          ...task,input,estimated_items:requestedItems,collection_depth:requestedDepth,
          collection_limit_field:countField??null,settings_warnings:settingsWarnings,
          actor_id:candidate.id,actor_title:candidate.title,actor_rating:candidate.rating,
          pricing_model:candidate.pricing_model,input_schema:schema,
          schema_valid:validationErrors.length===0,validation_errors:validationErrors,
        };
      });
      plan.actor_candidates=actorCandidates.map(({input_schema,...actor})=>actor);
      const {error}=await admin.from('ai_research_plans').insert({user_id:userId,project_id:projectId,plan,status:'pending_approval',estimated_cost:plan.estimated_cost_usd??null});
      if(error) throw error;
      await admin.from('research_projects').update({status:'awaiting_approval'}).eq('id',projectId).eq('user_id',userId);
      return json({ok:true,plan,actor_candidates:actorCandidates.length});
    }

    if (action === 'plans.approve') {
      const {planId}=body;
      const {data:plan,error}=await admin.from('ai_research_plans').select('*').eq('id',planId).eq('user_id',userId).single();
      if(error||!plan||plan.status!=='pending_approval') return json({error:'研究计划不存在或已处理'},409);
      const approvedContent = plan.plan as Record<string,unknown>;
      if (!Array.isArray(approvedContent.platform_tasks) || approvedContent.platform_tasks.length===0) return json({error:'研究计划没有可执行的采集任务'},400);
      const items=approvedContent.platform_tasks as Array<{platform_slug?:string;actor_id?:string|null;input?:Record<string,unknown>;schema_valid?:boolean;input_schema?:CompactInputSchema}>;
      if(items.some(item=>!item.platform_slug || typeof item.actor_id!=='string' || !item.actor_id.trim() || !item.input || typeof item.input!=='object' || Array.isArray(item.input) || item.schema_valid!==true || !item.input_schema)) {
        return json({error:'研究计划缺少来自 Apify Store 的有效 Actor 或未通过输入 Schema 校验。系统不会执行未经验证的采集配置。'},409);
      }
      for(const item of items) {
        const validationErrors=validateActorInput(item.input,item.input_schema as CompactInputSchema);
        if(validationErrors.length) return json({error:`Actor 输入参数校验失败：${validationErrors.join('；')}`},422);
      }
      const {clear:apifyToken}=await getCredential('apify','integration');
      for(const item of items) {
        const actor=encodeURIComponent(item.actor_id!).replace(/%2F/g,'~');
        const actorResponse=await fetch(`https://api.apify.com/v2/acts/${actor}`,{headers:{Authorization:`Bearer ${apifyToken}`}});
        const actorPayload=await actorResponse.json().catch(()=>({}));
        if(!actorResponse.ok || !actorPayload.data?.id || actorPayload.data?.isDeprecated) {
          return json({error:`Apify Actor 不存在、不可访问或已弃用：${item.platform_slug}`},422);
        }
      }
      const {error:updateError}=await admin.from('ai_research_plans').update({status:'approved',approved_at:new Date().toISOString(),approved_by:userId}).eq('id',planId).eq('user_id',userId).eq('status','pending_approval');
      if(updateError) throw updateError;
      const rows=items.map((item)=>({
        user_id:userId,project_id:plan.project_id,plan_id:planId,platform_slug:String(item.platform_slug??'unknown'),
        actor_id:item.actor_id!,input:item.input??{},status:'queued',
      }));
      if(rows.length){const {error:taskError}=await admin.from('collection_tasks').insert(rows);if(taskError)throw taskError;}
      await admin.from('research_projects').update({status:'active'}).eq('id',plan.project_id).eq('user_id',userId);
      return json({ok:true,created_tasks:rows.length});
    }

    if (action === 'tasks.cancel') {
      const taskId=String(body.taskId??'').trim();
      if(!taskId) return json({error:'缺少任务 ID'},400);
      const {data:task,error}=await admin.from('collection_tasks')
        .select('id,status,external_run_id').eq('id',taskId).eq('user_id',userId).maybeSingle();
      if(error||!task) return json({error:'采集任务不存在'},404);
      if(!['queued','running'].includes(task.status)) return json({error:'只有排队中或运行中的任务可以取消'},409);
      if(task.external_run_id) {
        const {clear:apifyToken}=await getCredential('apify','integration');
        const actorResponse=await fetch(`https://api.apify.com/v2/actor-runs/${encodeURIComponent(task.external_run_id)}/abort`,{
          method:'POST',headers:{Authorization:`Bearer ${apifyToken}`},
        });
        const payload=await actorResponse.json().catch(()=>({}));
        if(!actorResponse.ok && !['ABORTED','TIMED-OUT','FAILED','SUCCEEDED'].includes(String(payload?.data?.status??'').toUpperCase())) {
          return json({error:String(payload?.error?.message??'Apify 取消请求失败').slice(0,300)},502);
        }
      }
      const {data:updated,error:updateError}=await admin.from('collection_tasks')
        .update({status:'cancelled',finished_at:new Date().toISOString(),error_message:null})
        .eq('id',taskId).eq('user_id',userId).in('status',['queued','running'])
        .select('id,status').maybeSingle();
      if(updateError) throw updateError;
      if(!updated) return json({error:'任务状态已变化，请刷新后重试'},409);
      return json({ok:true,task:updated});
    }

    if (action === 'tasks.retry') {
      const { taskId } = body;
      const { data: task, error } = await admin.from('collection_tasks')
        .select('id,user_id,project_id,plan_id,platform_slug,actor_id,input,status,ai_research_plans!inner(status)')
        .eq('id',taskId).eq('user_id',userId).maybeSingle();
      if(error||!task) return json({error:'采集任务不存在'},404);
      if(task.status!=='failed'||task.ai_research_plans.status!=='approved') return json({error:'只有已批准研究计划中的失败任务可以重试'},409);
      if(!task.actor_id) return json({error:'任务缺少已确认的 Apify Actor ID，无法重试'},400);
      const retryInput=String(task.platform_slug??'').toLowerCase()==='amazon'?normalizeAmazonActorInput(task.actor_id,task.input):task.input??{};
      const {data:retry,error:insertError}=await admin.from('collection_tasks').insert({
        user_id:userId,project_id:task.project_id,plan_id:task.plan_id,platform_slug:task.platform_slug,
        actor_id:task.actor_id,input:retryInput,status:'queued',
      }).select('id').single();
      if(insertError||!retry) throw insertError??new Error('创建重试任务失败');
      return json({ok:true,taskId:retry.id,sourceTaskId:task.id});
    }

    if (action === 'tasks.execute') {
      const {taskId}=body;
      const {data:task,error}=await admin.from('collection_tasks').select('*,ai_research_plans!inner(status)').eq('id',taskId).eq('user_id',userId).single();
      if(error||!task||task.ai_research_plans.status!=='approved'||!task.actor_id||task.status!=='queued') return json({error:'任务未获人工审批、已执行，或缺少经确认的 Apify Actor ID'},403);
      const {clear:apifyToken}=await getCredential('apify','integration');
      const {data:claimed,error:claimError}=await admin.from('collection_tasks').update({status:'running',started_at:new Date().toISOString()}).eq('id',taskId).eq('user_id',userId).eq('status','queued').select('id').maybeSingle();
      if(claimError||!claimed) return json({error:'任务已被执行或状态已变化'},409);
      const actor=encodeURIComponent(task.actor_id).replace(/%2F/g,'~');
      const executionInput:Record<string,unknown>=String(task.platform_slug??'').toLowerCase()==='amazon'
        ?normalizeAmazonActorInput(task.actor_id,task.input)
        :(task.input&&typeof task.input==='object'&&!Array.isArray(task.input)?{...(task.input as Record<string,unknown>)}:{});
      if(String(task.platform_slug??'').toLowerCase()==='amazon') {
        const amazonUrlFields=['categoryOrProductUrls','productUrls','startUrls','urls'];
        const isValidHttpUrl=(value:unknown):value is string=>{
          if(typeof value!=='string'||!value.trim()||/[<>\u0000-\u001f]/.test(value)) return false;
          try { const parsed=new URL(value.trim()); return (parsed.protocol==='https:'||parsed.protocol==='http:')&&Boolean(parsed.hostname.includes('.')); } catch { return false; }
        };
        for(const field of amazonUrlFields) {
          if(!(field in executionInput)) continue;
          const original=Array.isArray(executionInput[field])?executionInput[field] as unknown[]:[];
          const valid=original.filter(isValidHttpUrl).map(value=>value.trim());
          if(valid.length===0) {
            const keywordCandidates=[
              ...original.filter((value):value is string=>typeof value==='string'&&value.trim()&&!isValidHttpUrl(value)),
              ...(Array.isArray(executionInput.searchTerms)?executionInput.searchTerms.filter((value):value is string=>typeof value==='string'&&value.trim()):[]),
            ];
            const keywords=[...new Set(keywordCandidates.map(value=>value.trim()))];
            executionInput[field]=keywords.length?keywords.map(keyword=>`https://www.amazon.com/s?k=${encodeURIComponent(keyword)}`):['https://www.amazon.com/'];
          } else executionInput[field]=valid;
        }
        if(typeof executionInput.reviewsCutoffDate!=='string'||!/^(\\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])(T[0-2]\\d:[0-5]\\d(:[0-5]\\d)?(\\.\\d+)?Z?)?$|^(\\d+)\\s*(minute|hour|day|week|month|year)s?$/.test(executionInput.reviewsCutoffDate)) executionInput.reviewsCutoffDate='1 year';
        await admin.from('collection_tasks').update({input:executionInput,updated_at:new Date().toISOString()}).eq('id',taskId).eq('user_id',userId);
      }
      let response: Response;
      try {
        response=await fetch(`https://api.apify.com/v2/acts/${actor}/runs`,{
          method:'POST',headers:{Authorization:`Bearer ${apifyToken}`,'Content-Type':'application/json'},
          body:JSON.stringify(executionInput),
        });
      } catch (networkError) {
        const message = networkError instanceof Error ? networkError.message.slice(0,300) : 'Network error';
        await admin.from('collection_tasks').update({
          status:'failed',error_message:`无法连接 Apify：${message}`,finished_at:new Date().toISOString(),
        }).eq('id',taskId).eq('user_id',userId).eq('status','running');
        return json({error:'连接 Apify 失败，任务已标记为失败，可检查网络后重新创建任务'},502);
      }
      const result=await response.json().catch(()=>({}));
      if(!response.ok || !result.data?.id) {
        const detail=String(result?.error?.message??result?.message??'Apify 未返回有效 Run ID').slice(0,500);
        await admin.from('collection_tasks').update({
          status:'failed',error_message:detail,finished_at:new Date().toISOString(),
        }).eq('id',taskId).eq('user_id',userId).eq('status','running');
        return json({error:detail},502);
      }
      const {error:runIdError}=await admin.from('collection_tasks')
        .update({external_run_id:result.data.id,updated_at:new Date().toISOString()})
        .eq('id',taskId).eq('user_id',userId).eq('status','running');
      if(runIdError) {
        await fetch(`https://api.apify.com/v2/actor-runs/${encodeURIComponent(result.data.id)}/abort`,{
          method:'POST',headers:{Authorization:`Bearer ${apifyToken}`},
        }).catch(()=>undefined);
        throw runIdError;
      }
      return json({ok:true,runId:result.data.id});
    }

    if (action === 'tasks.sync') {
      const { taskId } = body;
      const { data: task, error: taskError } = await admin.from('collection_tasks')
        .select('id,user_id,project_id,platform_slug,external_run_id,status,result_dataset_id,result_synced_count,result_count')
        .eq('id', taskId).eq('user_id', userId).maybeSingle();
      if (taskError || !task) return json({ error: '采集任务不存在' }, 404);
      if (!task.external_run_id) {
        if(task.status==='queued') return json({error:'任务仍在排队，尚未启动 Apify Actor。请先启动采集，再同步运行结果。'},409);
        if(task.status==='running') return json({error:'任务正在提交 Apify 启动请求，但 Run ID 尚未写入。请稍后刷新任务状态；若持续出现，请重新启动该任务。'},409);
        return json({ error: '该任务没有 Apify Run ID，无法同步运行结果。请检查任务错误详情或重新创建任务。' }, 409);
      }

      // Acquire a database-backed lease so concurrent sync requests cannot read
      // and advance the same result_synced_count cursor.
      const syncLockToken = crypto.randomUUID();
      const lockNow = new Date();
      const lockExpiresAt = new Date(lockNow.getTime() + 10 * 60 * 1000).toISOString();
      const { data: lock, error: lockError } = await admin.from('collection_tasks')
        .update({ sync_lock_token: syncLockToken, sync_lock_expires_at: lockExpiresAt })
        .eq('id', taskId).eq('user_id', userId)
        .or(`sync_lock_expires_at.is.null,sync_lock_expires_at.lt.${lockNow.toISOString()}`)
        .select('id').maybeSingle();
      if (lockError) throw lockError;
      if (!lock) return json({ error: '该任务正在同步，请稍后重试' }, 409);

      // Release the lease on every return path (including upstream errors).
      try {
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
        const maxPagesPerRequest = 4;
        for (let page = 0; page < maxPagesPerRequest && syncedCount < totalCount; page++) {
          const renewedUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString();
          const { data: renewed, error: renewError } = await admin.from('collection_tasks')
            .update({ sync_lock_expires_at: renewedUntil })
            .eq('id', taskId).eq('user_id', userId).eq('sync_lock_token', syncLockToken)
            .select('id').maybeSingle();
          if (renewError) throw renewError;
          if (!renewed) return json({ error: '同步租约已失效，请重新发起同步' }, 409);
          const pageOffset = syncedCount;
          const dataResponse = await fetch(`https://api.apify.com/v2/datasets/${encodeURIComponent(datasetId)}/items?clean=false&format=json&limit=${pageSize}&offset=${pageOffset}`, {
            headers: { Authorization: `Bearer ${apifyToken}` },
          });
          if (!dataResponse.ok) return json({ error: `采集完成，但第 ${pageOffset} 条之后的结果读取失败（HTTP ${dataResponse.status}），已保存 ${syncedCount}/${totalCount} 条，可重试从断点继续` }, 502);
          const payload = await dataResponse.json();
          const items: unknown[] = Array.isArray(payload) ? payload : [];
          if (items.length === 0) {
            if (syncedCount < totalCount) {
              return json({ error: `结果集返回空页，已同步 ${syncedCount}/${totalCount} 条；请重试或检查源数据集` }, 502);
            }
            break;
          }
          const rows = items.map((raw_data, index) => ({
            task_id: taskId, user_id: userId, item_index: pageOffset + index, raw_data,
            source_updated_at: new Date().toISOString(),
          }));
          const { error: insertError } = await admin.from('collection_task_results')
            .upsert(rows, { onConflict: 'task_id,item_index' });
          if (insertError) throw insertError;

          // Persist versioned canonical fields separately; raw_data above remains untouched.
          const normalizedRows = items.map((raw,index) => {
            const normalizedRecord=normalizeResearchRecord(task.platform_slug,raw as Record<string,unknown>);
            return {
              user_id:userId,project_id:task.project_id,task_id:taskId,item_index:pageOffset+index,
              platform_slug:task.platform_slug,entity_type:normalizedRecord.entityType,
              canonical_key:normalizedRecord.canonicalKey,normalized_data:normalizedRecord.normalizedData,
              field_sources:normalizedRecord.fieldSources,quality_score:normalizedRecord.qualityScore,
              warnings:normalizedRecord.warnings,normalization_version:normalizedRecord.normalizationVersion,
              normalized_at:new Date().toISOString(),
            };
          });
          if(normalizedRows.length) {
            const {error:normalizationError}=await admin.from('research_normalized_records')
              .upsert(normalizedRows,{onConflict:'task_id,item_index'});
            if(normalizationError) throw normalizationError;
          }

          // Product-specific entity matching and price history remain an additional specialized layer.
          const normalized = items.map((raw,index) => {
            const record=raw as Record<string,unknown>;
            const identity=resolveProductIdentity(task.platform_slug,record);
            const priceRaw=readField(record,[/^(price|sale.?price|current.?price|amount|cost|listing.?price|unit.?price)$/i]);
            const priceText=typeof priceRaw==='number'?String(priceRaw):typeof priceRaw==='string'?priceRaw.replace(/,/g,''):'';
            const priceMatch=priceText.match(/-?\d+(?:\.\d+)?/);
            const price=priceMatch?Number(priceMatch[0]):null;
            const currencyRaw=readField(record,[/^(currency|currency.?code|price.?currency)$/i]);
            const currency=currencyRaw?String(currencyRaw).trim().toUpperCase():null;
            return {record,index,identity:identity?.externalProductId??null,
              sourceUrl:identity?.sourceUrl??null,sku:identity?.sourceSku??null,
              canonicalKey:identity?.canonicalKey??null,
              title:readField(record,[/^(title|name|product.?name|item.?name)$/i]),
              brand:readField(record,[/^brand(name)?$/i]),
              category:readField(record,[/^(category|department|product.?type)$/i]),
              description:readField(record,[/^(description|product.?description|about)$/i]),
              image:readField(record,[/^(image|image.?url|thumbnail|picture)$/i]),
              price:price!==null&&Number.isFinite(price)&&price>=0?price:null,currency};
          }).filter(item=>item.identity);
          const uniqueNormalized = [...new Map(normalized.map(item=>[item.identity!,item])).values()];
          if (uniqueNormalized.length) {
            const asText=(value:unknown)=>value===null||value===undefined||typeof value==='object'?'':String(value).trim();
            const uniqueProducts=[...new Map(uniqueNormalized.map(item=>[item.canonicalKey!,item])).values()];
            const productRows=uniqueProducts.map(item=>({
              user_id:userId,canonical_key:item.canonicalKey!,
              ...(asText(item.title)?{title:asText(item.title)}:{}),
              ...(asText(item.brand)?{brand:asText(item.brand)}:{}),
              ...(asText(item.category)?{category:asText(item.category)}:{}),
              ...(asText(item.description)?{description:asText(item.description)}:{}),
              ...(asText(item.image)?{image_url:asText(item.image)}:{}),
              updated_at:new Date().toISOString(),
            }));
            const {data:products,error:productError}=await admin.from('products')
              .upsert(productRows,{onConflict:'user_id,canonical_key'})
              .select('id,canonical_key');
            if(productError) throw productError;
            const productIds=new Map((products??[]).map(product=>[product.canonical_key,product.id]));
            const sourceRows=uniqueNormalized.map(item=>({
              user_id:userId,product_id:productIds.get(item.canonicalKey!),
              platform_slug:task.platform_slug,external_product_id:item.identity!,
              source_url:item.sourceUrl,source_sku:item.sku,raw_data:item.record,last_seen_at:new Date().toISOString(),
            })).filter(item=>item.product_id);
            const {data:sources,error:sourceError}=await admin.from('product_source_records')
              .upsert(sourceRows,{onConflict:'user_id,platform_slug,external_product_id'})
              .select('id,external_product_id,product_id');
            if(sourceError) throw sourceError;
            const sourceIds=new Map((sources??[]).map(source=>[source.external_product_id,source]));
            const priceRows=uniqueNormalized.filter(item=>item.price!==null&&item.currency&&sourceIds.has(item.identity!))
              .map(item=>{
                const source=sourceIds.get(item.identity!)!;
                return {user_id:userId,product_id:source.product_id,source_record_id:source.id,
                  source_task_id:taskId,source_item_index:pageOffset+item.index,
                  price:item.price!,currency:item.currency!,observed_at:new Date().toISOString()};
              });
            if(priceRows.length) {
              const {error:priceError}=await admin.from('product_price_history')
                .upsert(priceRows,{onConflict:'source_record_id,source_task_id,source_item_index'});
              if(priceError) throw priceError;
            }
          }
          batchCount += items.length;
          syncedCount += items.length;
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
      const { data: committed, error: updateError } = await admin.from('collection_tasks').update(update)
        .eq('id', taskId).eq('user_id', userId).eq('sync_lock_token', syncLockToken)
        .neq('status', 'cancelled').select('id').maybeSingle();
      if (updateError) throw updateError;
      if (!committed) {
        // A cancellation may win while this batch is being persisted. Keep the
        // cancelled state, but record the durable cursor for the rows already saved.
        const { data: cancelled, error: cancelledUpdateError } = await admin.from('collection_tasks')
          .update({
            result_dataset_id: datasetId, result_count: totalCount,
            result_synced_count: syncedCount, synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', taskId).eq('user_id', userId).eq('sync_lock_token', syncLockToken)
          .eq('status', 'cancelled').select('id').maybeSingle();
        if (cancelledUpdateError) throw cancelledUpdateError;
        if (!cancelled) return json({ error: '同步租约已失效，或任务状态已变化；已保存数据可安全重试' }, 409);
        return json({
          ok: true,
          task: { id: taskId, status: 'cancelled', run_status: runStatus,
            result_dataset_id: datasetId, result_count: totalCount, result_synced_count: syncedCount,
            batch_count: batchCount, result_sync_complete: syncComplete, error_message: null },
          result_truncated: !syncComplete && runStatus === 'SUCCEEDED',
        });
      }
      return json({
        ok: true,
        task: { id: taskId, status, run_status: runStatus, progress: update.progress,
          result_dataset_id: datasetId, result_count: totalCount, result_synced_count: syncedCount,
          batch_count: batchCount, result_sync_complete: syncComplete, error_message: update.error_message ?? null },
        result_truncated: !syncComplete && runStatus === 'SUCCEEDED',
      });
      } finally {
        const { error: releaseError } = await admin.from('collection_tasks')
          .update({ sync_lock_token: null, sync_lock_expires_at: null })
          .eq('id', taskId).eq('user_id', userId).eq('sync_lock_token', syncLockToken);
        if (releaseError) {
          console.error('Failed to release task sync lease', { taskId, code: releaseError.code });
        }
      }
    }

    if (action === 'tasks.analytics') {
      const { taskId } = body;
      const { data: task, error: taskError } = await admin.from('collection_tasks')
        .select('id,platform_slug,status,result_count,result_synced_count')
        .eq('id', taskId).eq('user_id', userId).maybeSingle();
      if (taskError || !task) return json({ error: '采集任务不存在' }, 404);
      const total = Number(task.result_synced_count ?? 0);
      // Stream result rows in bounded pages; never materialize the full dataset.
      const pageSize = 500;
      let analyzed = 0;
      const fieldCache = new WeakMap<object, Array<[string, unknown]>>();
      const pick = (row: Record<string, unknown>, patterns: RegExp[]) => {
        let fields = fieldCache.get(row);
        if (!fields) {
          fields = [];
          const visit = (value: unknown, path: string, depth: number) => {
          if (value === null || value === undefined || depth > 5) return;
          if (Array.isArray(value)) {
            if (value.every(item => item === null || ['string','number','boolean'].includes(typeof item))) {
              fields.push([path, value.filter(item => item !== null).join(' ')]);
            }
            return;
          }
          if (typeof value === 'object') {
            for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
              visit(nested, path ? path + '.' + key : key, depth + 1);
            }
            return;
          }
          if (value !== '') fields.push([path, value]);
          };
          visit(row, '', 0);
          fieldCache.set(row, fields);
        }
        for (const [path, value] of fields) {
          const leaf = path.split('.').pop() ?? path;
          if (patterns.some(pattern => pattern.test(leaf) || pattern.test(path))) return value;
        }
        return null;
      };
      const numeric = (value: unknown) => {
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value !== 'string') return null;
        const match = value.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
        return match ? Number(match[0]) : null;
      };
      const ratingStats = {sum:0,count:0};
      const reviewStats = {sum:0,count:0};
      const engagementStats = {views:{sum:0,count:0},likes:{sum:0,count:0},comments:{sum:0,count:0},shares:{sum:0,count:0},followers:{sum:0,count:0},rank:{sum:0,count:0},salary:{sum:0,count:0}};
      const entityTypes = new Map<string,number>();
      const brands = new Map<string, number>();
      const categories = new Map<string, number>();
      const words = new Map<string, number>();
      const countries = new Map<string, number>();
      const reviewWords = new Map<string, number>();
      const ratingBuckets = new Map<string, number>();
      const MAX_DISTINCT = 5000;
      const incrementBounded = (map:Map<string,number>, key:string) => {
        if (map.has(key)) { map.set(key,(map.get(key)??0)+1); return; }
        if (map.size < MAX_DISTINCT) { map.set(key,1); return; }
        let minKey:string|undefined, minCount=Infinity;
        for (const [candidate,count] of map) if (count < minCount) { minKey=candidate; minCount=count; }
        if (minKey !== undefined) { map.delete(minKey); map.set(key,minCount+1); }
      };
      const SAMPLE_LIMIT = 10000;
      const currencyStats = new Map<string,{count:number;sum:number;min:number;max:number;sample:number[];bands:number[]}>();
      let priceCount = 0;
      const fieldCounts = { title:0, price:0, currency:0, rating:0, reviews:0, brand:0, category:0, image:0, link:0, sku:0, description:0, sales:0, sales_rank:0, stock:0, country:0, review_text:0, views:0, likes:0, comments:0, shares:0, followers:0, rank:0, salary:0 };
      const trendMap = new Map<string, {count:number;priceCount:number;priceSum:number}>();
      const funnel = { total: 0, titled: 0, priced: 0, rated: 0, imaged: 0, linked: 0 };
      const stop = new Set(['the','and','for','with','from','this','that','you','your','new','pack','set','inch','inches','of','to','a','an','on','by','is','are','（','）']);
      for (let offset = 0; offset < total; offset += pageSize) {
        const { data: page, error: pageError } = await admin.from('collection_task_results')
          .select('raw_data').eq('task_id', taskId).eq('user_id', userId)
          .order('item_index', { ascending: true }).range(offset, Math.min(total - 1, offset + pageSize - 1));
        if (pageError) throw pageError;
        const rows = page ?? [];
        analyzed += rows.length;
        for (const entry of rows) {
          const row = entry.raw_data as Record<string, unknown>;
        const title = pick(row, [/^(title|name|product.?name|item.?name)$/i]);
        const price = numeric(pick(row, [/^(price|sale.?price|current.?price|amount|cost|listing.?price|unit.?price|salary|compensation|rent|nightly.?price)$/i]));
        const currencyValue = pick(row, [/^(currency|currency.?code|price.?currency|currency.?symbol)$/i]);
        const currency = currencyValue ? String(currencyValue).trim().toUpperCase() : 'UNKNOWN';
        const rating = numeric(pick(row, [/^(rating|stars|average.?rating|average.?score)$/i]));
        const reviews = numeric(pick(row, [/review.?count|ratings.?count|total.?reviews|review.?total/i]));
        const views = numeric(pick(row, [/^(views?|view.?count|play.?count|video.?views?|plays?|installs?|downloads?)$/i]));
        const likes = numeric(pick(row, [/^(likes?|like.?count|digg.?count|favorite.?count)$/i]));
        const comments = numeric(pick(row, [/^(comments?|comment.?count|replies|reply.?count)$/i]));
        const shares = numeric(pick(row, [/^(shares?|share.?count|repost.?count)$/i]));
        const followers = numeric(pick(row, [/^(followers?|follower.?count|subscribers?|subscriber.?count)$/i]));
        const rank = numeric(pick(row, [/^(rank|position|search.?rank|sales.?rank|best.?seller.?rank|bsr)$/i]));
        const salary = numeric(pick(row, [/^(salary|compensation|annual.?salary|hourly.?rate|pay)$/i]));
        const entityType = String(pick(row, [/^(entity.?type|record.?type|content.?type)$/i])??'generic');
        incrementBounded(entityTypes,entityType);
        const brand = pick(row, [/^brand(name)?$/i]);
        const category = pick(row, [/category|department|product.?type|taxonomy/i]);
        const image = pick(row, [/image|thumbnail|picture|photo/i]);
        const link = pick(row, [/^(url|link|product.?url|item.?url|canonical.?url)$/i]);
        const sku = pick(row, [/^(sku|asin|upc|ean|gtin|product.?id|item.?id)$/i]);
        const description = pick(row, [/^(description|product.?description|about)$/i]);
        const sales = numeric(pick(row, [/^(sales.?volume|units.?sold|sold.?count|monthly.?sales|estimated.?sales|sales.?count)$/i]));
        const salesRank = numeric(pick(row, [/^(sales.?rank|best.?seller.?rank|bsr|rank)$/i]));
        const stock = numeric(pick(row, [/^(stock|inventory|quantity|available.?quantity|in.?stock)$/i]));
        const country = pick(row, [/^(country|country.?name|country.?code|region|seller.?location|ship.?from|ships.?from)$/i]);
        const reviewText = pick(row, [/^(review.?text|review.?content|review.?body|comment.?text|feedback.?text|customer.?review|review)$/i]);
        const dateValue = pick(row, [/^(date|created.?at|published.?at|scraped.?at|timestamp|date.?created)$/i]);
        if (dateValue !== null) {
          const rawTime = typeof dateValue === 'number' ? dateValue : Date.parse(String(dateValue));
          const date = new Date(typeof rawTime === 'number' && Number.isFinite(rawTime) ? (rawTime < 100000000000 ? rawTime * 1000 : rawTime) : NaN);
          if (!Number.isNaN(date.getTime())) {
            const key = date.toISOString().slice(0,10);
            const point = trendMap.get(key) ?? {count:0,priceCount:0,priceSum:0};
            point.count++;
            if (price !== null && price >= 0) { point.priceCount++; point.priceSum += price; }
            trendMap.set(key,point);
          }
        }
        if (title) { funnel.titled++; fieldCounts.title++; }
        if (price !== null && price >= 0) {
          priceCount++; funnel.priced++; fieldCounts.price++;
          let group = currencyStats.get(currency);
          if (!group) { group={count:0,sum:0,min:price,max:price,sample:[],bands:[0,0,0,0,0]}; currencyStats.set(currency,group); }
          group.count++; group.sum+=price; group.min=Math.min(group.min,price); group.max=Math.max(group.max,price);
          const bandIndex=price<25?0:price<50?1:price<100?2:price<250?3:4; group.bands[bandIndex]++;
          if (group.sample.length < SAMPLE_LIMIT) group.sample.push(price);
          else {
            const sampleIndex=Math.floor(Math.random()*group.count);
            if (sampleIndex < SAMPLE_LIMIT) group.sample[sampleIndex]=price;
          }
        }
        if (currencyValue) fieldCounts.currency++;
        for (const [key,value] of Object.entries({views,likes,comments,shares,followers,rank,salary})) if(value!==null&&value>=0){engagementStats[key as keyof typeof engagementStats].sum+=value;engagementStats[key as keyof typeof engagementStats].count++;fieldCounts[key as keyof typeof fieldCounts]++;}
        if (rating !== null && rating >= 0) { ratingStats.sum+=rating; ratingStats.count++; funnel.rated++; fieldCounts.rating++; const bucket=String(Math.round(rating*2)/2); ratingBuckets.set(bucket,(ratingBuckets.get(bucket)??0)+1); }
        if (reviews !== null && reviews >= 0) { reviewStats.sum+=reviews; reviewStats.count++; fieldCounts.reviews++; }
        if (image) { funnel.imaged++; fieldCounts.image++; }
        if (link) { funnel.linked++; fieldCounts.link++; }
        if (brand) fieldCounts.brand++;
        if (category) fieldCounts.category++;
        if (sku) fieldCounts.sku++;
        if (description) fieldCounts.description++;
        if (sales !== null && sales >= 0) fieldCounts.sales++;
        if (salesRank !== null && salesRank >= 0) fieldCounts.sales_rank++;
        if (stock !== null && stock >= 0) fieldCounts.stock++;
        if (country) { fieldCounts.country++; incrementBounded(countries,String(country).trim()); }
        if (reviewText) {
          fieldCounts.review_text++;
          const reviewValue=String(reviewText).toLowerCase();
          for(const word of reviewValue.match(/[a-z0-9\u4e00-\u9fff]{2,}/g)??[]) if(!stop.has(word)&&!/^\d+$/.test(word)) incrementBounded(reviewWords,word);
        }
        if (brand) incrementBounded(brands,String(brand).trim());
        if (category) incrementBounded(categories,String(category).trim());
        const textValue = [title, category, brand].filter(Boolean).join(' ').toLowerCase();
        for (const word of textValue.match(/[a-z0-9\u4e00-\u9fff]{2,}/g) ?? []) {
          if (!stop.has(word) && !/^\d+$/.test(word)) incrementBounded(words,word);
        }
      }
      }
      funnel.total = analyzed;
      const comparableCurrency = currencyStats.size === 1 && !currencyStats.has('UNKNOWN')
        ? [...currencyStats.keys()][0] : null;
      const comparableStats = comparableCurrency ? currencyStats.get(comparableCurrency) : null;
      const sorted = comparableStats ? [...comparableStats.sample].sort((a,b)=>a-b) : [];
      const percentile = (p:number) => sorted.length ? sorted[Math.min(sorted.length-1,Math.floor((sorted.length-1)*p))] : null;
      const average = (sum:number,count:number) => count ? sum/count : null;
      const top = (map:Map<string,number>) => [...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10).map(([label,count])=>({label,count}));
      const trends = [...trendMap.entries()].sort((a,b)=>a[0].localeCompare(b[0])).slice(-30).map(([date,point])=>({date,count:point.count,average_price:average(point.priceSum,point.priceCount)}));
      const makeBands = (counts:number[]) => [
        {label:'0–25',count:counts[0]},{label:'25–50',count:counts[1]},
        {label:'50–100',count:counts[2]},{label:'100–250',count:counts[3]},
        {label:'250+',count:counts[4]},
      ];
      const bands = comparableStats ? makeBands(comparableStats.bands) : [];
      const bandsByCurrency = [...currencyStats.entries()].map(([currency,stats])=>({currency,bands:makeBands(stats.bands)}));
      return json({
        task, coverage:{analyzed,available:total,complete:analyzed>=total},
        metrics:{average_views:average(engagementStats.views.sum,engagementStats.views.count),average_likes:average(engagementStats.likes.sum,engagementStats.likes.count),average_comments:average(engagementStats.comments.sum,engagementStats.comments.count),average_shares:average(engagementStats.shares.sum,engagementStats.shares.count),average_followers:average(engagementStats.followers.sum,engagementStats.followers.count),average_rank:average(engagementStats.rank.sum,engagementStats.rank.count),average_salary:average(engagementStats.salary.sum,engagementStats.salary.count),engagement_rate:engagementStats.views.sum>0?(engagementStats.likes.sum+engagementStats.comments.sum+engagementStats.shares.sum)/engagementStats.views.sum:null,average_price:comparableStats?average(comparableStats.sum,comparableStats.count):null,min_price:comparableStats?.min??null,max_price:comparableStats?.max??null,median_price:percentile(0.5),p25_price:percentile(0.25),p75_price:percentile(0.75),price_currency:comparableCurrency,price_comparable:Boolean(comparableCurrency),percentiles_approximate:true,average_rating:average(ratingStats.sum,ratingStats.count),average_reviews:average(reviewStats.sum,reviewStats.count),price_count:priceCount,comparable_price_count:comparableStats?.count??0,rating_count:ratingStats.count,review_count:reviewStats.count},
        distributions:{entity_types:top(entityTypes),price_bands:bands,price_bands_by_currency:bandsByCurrency,brands:top(brands),categories:top(categories),words:top(words),countries:top(countries),review_words:top(reviewWords),rating_distribution:[...ratingBuckets.entries()].sort((a,b)=>Number(a[0])-Number(b[0])).map(([rating,count])=>({rating:Number(rating),count})),price_by_currency:[...currencyStats.entries()].map(([currency,stats])=>({currency,count:stats.count,average:average(stats.sum,stats.count),min:stats.min,max:stats.max})).sort((a,b)=>b.count-a.count)},
        trends,
        funnel, field_counts:fieldCounts,
        quality:{title_rate:analyzed?fieldCounts.title/analyzed:0,price_rate:analyzed?fieldCounts.price/analyzed:0,currency_rate:analyzed?fieldCounts.currency/analyzed:0,rating_rate:analyzed?fieldCounts.rating/analyzed:0,reviews_rate:analyzed?fieldCounts.reviews/analyzed:0,brand_rate:analyzed?fieldCounts.brand/analyzed:0,category_rate:analyzed?fieldCounts.category/analyzed:0,image_rate:analyzed?fieldCounts.image/analyzed:0,link_rate:analyzed?fieldCounts.link/analyzed:0,sku_rate:analyzed?fieldCounts.sku/analyzed:0,description_rate:analyzed?fieldCounts.description/analyzed:0,sales_rate:analyzed?fieldCounts.sales/analyzed:0,sales_rank_rate:analyzed?fieldCounts.sales_rank/analyzed:0,stock_rate:analyzed?fieldCounts.stock/analyzed:0,country_rate:analyzed?fieldCounts.country/analyzed:0,review_text_rate:analyzed?fieldCounts.review_text/analyzed:0,views_rate:analyzed?fieldCounts.views/analyzed:0,likes_rate:analyzed?fieldCounts.likes/analyzed:0,comments_rate:analyzed?fieldCounts.comments/analyzed:0,shares_rate:analyzed?fieldCounts.shares/analyzed:0,followers_rate:analyzed?fieldCounts.followers/analyzed:0,rank_rate:analyzed?fieldCounts.rank/analyzed:0,salary_rate:analyzed?fieldCounts.salary/analyzed:0}
      });
    }

    if (action === 'tasks.logs') {
      const taskId=String(body.taskId??'').trim();
      if(!taskId) return json({error:'缺少任务 ID'},400);
      const {data:task,error}=await admin.from('collection_tasks')
        .select('id,status,external_run_id').eq('id',taskId).eq('user_id',userId).maybeSingle();
      if(error||!task) return json({error:'采集任务不存在'},404);
      if(!task.external_run_id) return json({logs:'等待 Apify Run 启动，暂时没有运行日志。',available:false});
      const response=await fetch(`https://api.apify.com/v2/actor-runs/${encodeURIComponent(task.external_run_id)}/log?raw=0`,{
        headers:{Accept:'text/plain'},
      });
      if(!response.ok) {
        const detail=(await response.text()).slice(0,300);
        return json({error:`Apify 日志读取失败（${response.status}）：${detail}`},502);
      }
      const raw=await response.text();
      return json({logs:raw.slice(-12000),available:Boolean(raw.trim()),truncated:raw.length>12000});
    }

    if (action === 'tasks.project-results') {
      const projectId=String(body.projectId??'').trim();
      const limit=Math.min(250,Math.max(1,Number(body.limit)||100));
      const offset=Math.max(0,Number(body.offset)||0);
      if(!projectId) return json({error:'缺少研究项目 ID'},400);
      const {data:projectTasks,error:taskError}=await admin.from('collection_tasks')
        .select('id,platform_slug,status,result_count,result_synced_count')
        .eq('project_id',projectId).eq('user_id',userId).order('created_at',{ascending:true});
      if(taskError) throw taskError;
      const tasks=projectTasks??[];
      const taskIds=tasks.map(task=>task.id);
      if(!taskIds.length) return json({project_id:projectId,results:[],tasks:[],total:0,limit,offset});
      const {data:rows,error:rowsError,count}=await admin.from('collection_task_results')
        .select('task_id,item_index,raw_data',{count:'exact'})
        .eq('user_id',userId).in('task_id',taskIds)
        .order('task_id',{ascending:true}).order('item_index',{ascending:true})
        .range(offset,offset+limit-1);
      if(rowsError) throw rowsError;
      const {data:normalizedRows,error:normalizedError}=await admin.from('research_normalized_records')
        .select('task_id,item_index,entity_type,canonical_key,normalized_data,field_sources,quality_score,warnings,normalization_version')
        .eq('user_id',userId).eq('project_id',projectId).in('task_id',taskIds)
        .order('task_id',{ascending:true}).order('item_index',{ascending:true})
        .range(offset,offset+limit-1);
      if(normalizedError) throw normalizedError;
      const platformByTask=new Map(tasks.map(task=>[task.id,task.platform_slug]));
      const normalizedByKey=new Map((normalizedRows??[]).map(row=>[`${row.task_id}:${row.item_index}`,row]));
      // Lazy backfill: older projects are normalized page-by-page when opened.
      const missingRows=(rows??[]).filter(row=>!normalizedByKey.has(`${row.task_id}:${row.item_index}`));
      if(missingRows.length) {
        const backfillRows=missingRows.map(row=>{
          const platform=platformByTask.get(row.task_id)??'unknown';
          const normalizedRecord=normalizeResearchRecord(platform,row.raw_data as Record<string,unknown>);
          return {
            user_id:userId,project_id:projectId,task_id:row.task_id,item_index:row.item_index,
            platform_slug:platform,entity_type:normalizedRecord.entityType,canonical_key:normalizedRecord.canonicalKey,
            normalized_data:normalizedRecord.normalizedData,field_sources:normalizedRecord.fieldSources,
            quality_score:normalizedRecord.qualityScore,warnings:normalizedRecord.warnings,
            normalization_version:normalizedRecord.normalizationVersion,normalized_at:new Date().toISOString(),
          };
        });
        const {error:backfillError}=await admin.from('research_normalized_records')
          .upsert(backfillRows,{onConflict:'task_id,item_index'});
        if(backfillError) throw backfillError;
        for(const row of backfillRows) normalizedByKey.set(`${row.task_id}:${row.item_index}`,row);
      }
      return json({
        project_id:projectId,tasks,
        results:(rows??[]).map(row=>({
          task_id:row.task_id,platform_slug:platformByTask.get(row.task_id)??'unknown',
          item_index:row.item_index,raw_data:row.raw_data,
          normalized:normalizedByKey.get(`${row.task_id}:${row.item_index}`)??null,
        })),
        total:count??0,limit,offset,
      });
    }

    if (action === 'tasks.project-normalization-summary') {
      const projectId=String(body.projectId??'').trim();
      if(!projectId) return json({error:'缺少研究项目 ID'},400);
      const {data:projectTasks,error:taskError}=await admin.from('collection_tasks')
        .select('id,platform_slug,result_synced_count')
        .eq('project_id',projectId).eq('user_id',userId).order('created_at',{ascending:true});
      if(taskError) throw taskError;
      const tasks=projectTasks??[];
      if(!tasks.length) return json({project_id:projectId,coverage:{total_records:0,normalized_records:0,normalization_rate:0},average_quality_score:null,warning_records:0,entity_type_distribution:[],normalization_version:1});
      const entityCounts=new Map<string,number>();
      let totalRecords=0,normalizedRecords=0,qualitySum=0,warningRecords=0;
      for(const task of tasks) {
        const taskTotal=Math.max(0,Number(task.result_synced_count??0));
        totalRecords+=taskTotal;
        const pageSize=500;
        for(let offset=0;offset<taskTotal;offset+=pageSize) {
          const end=Math.min(taskTotal-1,offset+pageSize-1);
          const {data:rawRows,error:rawError}=await admin.from('collection_task_results')
            .select('task_id,item_index,raw_data').eq('task_id',task.id).eq('user_id',userId)
            .order('item_index',{ascending:true}).range(offset,end);
          if(rawError) throw rawError;
          const rows=rawRows??[];
          if(!rows.length) continue;
          const indices=rows.map(row=>row.item_index);
          const {data:existingRows,error:existingError}=await admin.from('research_normalized_records')
            .select('item_index,entity_type,quality_score,warnings')
            .eq('task_id',task.id).eq('user_id',userId).in('item_index',indices);
          if(existingError) throw existingError;
          const existingByIndex=new Map((existingRows??[]).map(row=>[row.item_index,row]));
          const missing=rows.filter(row=>!existingByIndex.has(row.item_index));
          if(missing.length) {
            const backfill=missing.map(row=>{
              const result=normalizeResearchRecord(task.platform_slug,row.raw_data as Record<string,unknown>);
              return {user_id:userId,project_id:projectId,task_id:task.id,item_index:row.item_index,platform_slug:task.platform_slug,entity_type:result.entityType,canonical_key:result.canonicalKey,normalized_data:result.normalizedData,field_sources:result.fieldSources,quality_score:result.qualityScore,warnings:result.warnings,normalization_version:result.normalizationVersion,normalized_at:new Date().toISOString()};
            });
            const {error:backfillError}=await admin.from('research_normalized_records').upsert(backfill,{onConflict:'task_id,item_index'});
            if(backfillError) throw backfillError;
            for(const row of backfill) existingByIndex.set(row.item_index,{item_index:row.item_index,entity_type:row.entity_type,quality_score:row.quality_score,warnings:row.warnings});
          }
          for(const row of rows) {
            const normalized=existingByIndex.get(row.item_index);
            if(!normalized) continue;
            normalizedRecords++;
            qualitySum+=Number(normalized.quality_score??0);
            if(Array.isArray(normalized.warnings)&&normalized.warnings.length) warningRecords++;
            const type=String(normalized.entity_type??'generic');
            entityCounts.set(type,(entityCounts.get(type)??0)+1);
          }
        }
      }
      return json({
        project_id:projectId,
        coverage:{total_records:totalRecords,normalized_records:normalizedRecords,normalization_rate:totalRecords?normalizedRecords/totalRecords:0},
        average_quality_score:normalizedRecords?Math.round(qualitySum/normalizedRecords):null,
        warning_records:warningRecords,
        entity_type_distribution:[...entityCounts.entries()].sort((a,b)=>b[1]-a[1]).map(([entity_type,count])=>({entity_type,count})),
        normalization_version:1,
        quality_score_definition:'按实体类型预期字段计算的字段完整度，不代表事实准确率或模型置信度。',
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

    if (action === 'products.list') {
      const limit=Math.min(100,Math.max(1,Number(body.limit)||25));
      const offset=Math.max(0,Number(body.offset)||0);
      const search=String(body.search??'').trim().slice(0,120);
      let query=admin.from('products')
        .select('id,canonical_key,title,brand,category,description,image_url,created_at,updated_at',{count:'exact'})
        .eq('user_id',userId).order('updated_at',{ascending:false})
        .range(offset,offset+limit-1);
      if(search) query=query.or(`title.ilike.%${search.replace(/[,%()]/g,' ')}%,brand.ilike.%${search.replace(/[,%()]/g,' ')}%,canonical_key.ilike.%${search.replace(/[,%()]/g,' ')}%`);
      const {data,error,count}=await query;
      if(error) throw error;
      const ids=(data??[]).map(item=>item.id);
      let sources:Record<string,unknown>[]=[];
      if(ids.length) {
        const result=await admin.from('product_source_records')
          .select('id,product_id,platform_slug,external_product_id,source_url,source_sku,first_seen_at,last_seen_at')
          .eq('user_id',userId).in('product_id',ids).order('last_seen_at',{ascending:false});
        if(result.error) throw result.error;
        sources=result.data??[];
      }
      return json({products:data??[],sources,total:count??0,limit,offset});
    }

    if (action === 'products.history') {
      const productId=String(body.productId??'').trim();
      if(!productId) return json({error:'缺少商品 ID'},400);
      const limit=Math.min(250,Math.max(1,Number(body.limit)||100));
      const offset=Math.max(0,Number(body.offset)||0);
      const {data:product,error:productError}=await admin.from('products')
        .select('id,canonical_key,title,brand,category').eq('id',productId)
        .eq('user_id',userId).maybeSingle();
      if(productError||!product) return json({error:'商品不存在'},404);
      const {data:history,error,count}=await admin.from('product_price_history')
        .select('id,price,currency,observed_at,source_task_id,source_item_index,source_record_id',{count:'exact'})
        .eq('product_id',productId).eq('user_id',userId)
        .order('observed_at',{ascending:true}).range(offset,offset+limit-1);
      if(error) throw error;
      const sourceIds=[...new Set((history??[]).map(item=>item.source_record_id))];
      let sourceMap:Record<string,unknown>={};
      if(sourceIds.length) {
        const result=await admin.from('product_source_records')
          .select('id,platform_slug,external_product_id,source_url')
          .eq('user_id',userId).in('id',sourceIds);
        if(result.error) throw result.error;
        sourceMap=Object.fromEntries((result.data??[]).map(source=>[source.id,source]));
      }
      return json({product,history:(history??[]).map(item=>({...item,source:sourceMap[item.source_record_id]??null})),total:count??0,limit,offset});
    }

    return json({error:'未知操作'},404);
  } catch (error) {
    return json({error:error instanceof Error?error.message:'服务器内部错误'},500);
  }
});
