import { Button, PasswordInput, Select, SelectItem, Tag, TextInput, Tile } from '@carbon/react';
import { Renew } from '@carbon/icons-react';
import { BrandIcon } from '../../components/BrandIcon';
import { apiIntegrations, providers } from '../../data/catalog';

type Credential={slug:string;name:string;kind:'provider'|'integration';status:string};
type Props={
  credentials:Credential[]; keyValues:Record<string,string>; setKeyValues:(value:Record<string,string>|((current:Record<string,string>)=>Record<string,string>))=>void;
  cloudflareAccountId:string; setCloudflareAccountId:(value:string)=>void;
  integrationMeta:Record<string,string>; setIntegrationMeta:(value:Record<string,string>|((current:Record<string,string>)=>Record<string,string>))=>void;
  providerModels:Record<string,string>; selectedProvider:string; setSelectedProvider:(value:string)=>void;
  onSave:(slug:string,name:string,kind:'provider'|'integration')=>void; onTest:(slug:string,kind:'provider'|'integration')=>void;
};
export function CredentialVault(props:Props) {
  const {credentials,keyValues,setKeyValues,cloudflareAccountId,setCloudflareAccountId,integrationMeta,setIntegrationMeta,providerModels,selectedProvider,setSelectedProvider,onSave,onTest}=props;
  return <section className="module-stack">
    <div className="module-heading"><div><h2>AI Provider API Keys</h2><p>输入后立即发送到认证后端，采用 AES-GCM 加密保存。不会写入 localStorage、sessionStorage 或前端环境变量。</p></div><Tag type="green">BYOK</Tag></div>
    <section><h3>AI 模型</h3><div className="vault-grid">{providers.map(p=><Tile key={p.slug} className="vault-card">
      <div className="card-head"><BrandIcon slug={p.slug} label={p.name} fallback={p.fallback} size={34}/><div><h3>{p.name}</h3><p>{providerModels[p.slug] ?? '模型可在路由配置中指定'}</p></div><Tag type={credentials.some(c=>c.slug===p.slug)?'green':'cool-gray'}>{credentials.find(c=>c.slug===p.slug)?.status==='validated'?'已验证':credentials.some(c=>c.slug===p.slug)?'已保存':'未配置'}</Tag></div>
      <PasswordInput id={`key-${p.slug}`} labelText={p.slug==='cloudflare'?'Cloudflare API Token':'API Key'} placeholder="粘贴 API Key" value={keyValues[p.slug]??''} onChange={e=>setKeyValues(v=>({...v,[p.slug]:e.target.value}))} autoComplete="off"/>
      {p.slug==='cloudflare' && <TextInput id="cloudflare-account-id" labelText="Cloudflare Account ID" placeholder="输入 Account ID" value={cloudflareAccountId} onChange={e=>setCloudflareAccountId(e.target.value)} />}
      <div className="card-actions"><Button kind="tertiary" size="sm" onClick={()=>onSave(p.slug,p.name,'provider')} disabled={!keyValues[p.slug]?.trim()}>加密保存</Button><Button kind="secondary" size="sm" renderIcon={Renew} onClick={()=>onTest(p.slug,'provider')} disabled={!credentials.some(c=>c.slug===p.slug)}>连接测试</Button></div>
    </Tile>)}</div></section>
    <section><h3>平台与外部 API</h3><div className="vault-grid">{apiIntegrations.map(item=><Tile key={item.slug} className="vault-card">
      <div className="card-head"><BrandIcon slug={item.slug} label={item.name} fallback={item.fallback} size={34}/><div><h3>{item.name}</h3><p>{item.credentialLabel}</p></div><Tag type={credentials.some(c=>c.slug===item.slug)?'green':'cool-gray'}>{credentials.some(c=>c.slug===item.slug)?'已保存':'未配置'}</Tag></div>
      <PasswordInput id={`key-${item.slug}`} labelText={item.credentialLabel} placeholder={item.placeholder} value={keyValues[item.slug]??''} onChange={e=>setKeyValues(v=>({...v,[item.slug]:e.target.value}))} autoComplete="off"/>
      {item.slug==='reddit' && <TextInput id="reddit-client-id" labelText="Reddit Client ID" placeholder="填写 OAuth Client ID" value={integrationMeta.reddit??''} onChange={e=>setIntegrationMeta(v=>({...v,reddit:e.target.value}))}/>}
      {item.slug==='tiktok' && <TextInput id="tiktok-client-key" labelText="TikTok Client Key" placeholder="填写 Client Key" value={integrationMeta.tiktok??''} onChange={e=>setIntegrationMeta(v=>({...v,tiktok:e.target.value}))}/>}
      <div className="card-actions"><Button kind="tertiary" size="sm" onClick={()=>onSave(item.slug,item.name,'integration')} disabled={!keyValues[item.slug]?.trim()}>加密保存</Button><Button kind="secondary" size="sm" onClick={()=>onTest(item.slug,'integration')} disabled={!credentials.some(c=>c.slug===item.slug)}>连接测试</Button></div>
    </Tile>)}</div></section>
    <Tile><h3>统一 AI 模型路由</h3><p>系统通过单一后端入口路由至 OpenAI、Gemini、DeepSeek、Claude、Workers AI。各供应商凭证独立保存，按用户隔离。</p><Select id="default-provider" labelText="默认模型 Provider" value={selectedProvider} onChange={e=>setSelectedProvider(e.target.value)}>{providers.map(p=><SelectItem key={p.slug} value={p.slug} text={p.name}/>)}</Select></Tile>
  </section>;
}
