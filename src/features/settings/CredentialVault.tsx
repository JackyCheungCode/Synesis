import { Button, Column, Grid, PasswordInput, Select, SelectItem, Tag, TextInput, Tile } from '../../components/ui';
import { Renew } from '../../components/icons';
import { BrandIcon } from '../../components/BrandIcon';
import { apiIntegrations, providers } from '../../data/catalog';

type Credential={slug:string;name:string;kind:'provider'|'integration';status:string;account_id?:string};
type ProviderModel={id:string;name?:string;task?:string};
type Props={
  credentials:Credential[]; keyValues:Record<string,string>; setKeyValues:(value:Record<string,string>|((current:Record<string,string>)=>Record<string,string>))=>void;
  cloudflareAccountId:string; setCloudflareAccountId:(value:string)=>void;
  integrationMeta:Record<string,string>; setIntegrationMeta:(value:Record<string,string>|((current:Record<string,string>)=>Record<string,string>))=>void;
  providerModels:Record<string,string>; selectedProvider:string; setSelectedProvider:(value:string)=>void;
  models:Record<string,ProviderModel[]>; selectedModels:Record<string,string>; onLoadModels:(slug:string)=>void; onSelectModel:(slug:string,model:string)=>void;
  onSave:(slug:string,name:string,kind:'provider'|'integration')=>void; onTest:(slug:string,kind:'provider'|'integration')=>void; busy?:boolean;
};
export function CredentialVault(props:Props) {
  const {credentials,keyValues,setKeyValues,cloudflareAccountId,setCloudflareAccountId,integrationMeta,setIntegrationMeta,providerModels,selectedProvider,setSelectedProvider,models,selectedModels,onLoadModels,onSelectModel,onSave,onTest,busy=false}=props;
  return <section className="module-stack credential-vault-page">
    <header className="vault-intro"><span className="dashboard-eyebrow">AI MODEL & CONNECTIONS</span><h2>管理模型与数据源凭证</h2><p>密钥由后端加密保存；页面仅展示配置状态，不回显完整密钥。</p></header>
    <section className="vault-section"><div className="module-heading"><div><h2>AI 模型提供商</h2><p>配置模型 API Key，并测试服务连接。</p></div><Tag type="blue">{providers.length} 个 Provider</Tag></div><Grid condensed className="vault-grid">{providers.map(p=><Column key={p.slug} sm={4} md={4} lg={8} xlg={8}><Tile className="vault-card">
      <div className="card-head"><BrandIcon slug={p.slug} label={p.name} fallback={p.fallback} size={34}/><div><h3>{p.name}</h3><p>{providerModels[p.slug] ?? '模型可在路由配置中指定'}</p></div><Tag type={credentials.some(c=>c.slug===p.slug)?'green':'cool-gray'}>{credentials.find(c=>c.slug===p.slug)?.status==='validated'?'已验证':credentials.some(c=>c.slug===p.slug)?'已保存':'未配置'}</Tag></div>
      <PasswordInput id={`key-${p.slug}`} labelText={p.slug==='cloudflare'?'Cloudflare API Token':'API Key'} placeholder={credentials.some(c=>c.slug===p.slug)?'••••••••••••••••':'粘贴 API Key'} value={keyValues[p.slug]??''} onChange={e=>setKeyValues(v=>({...v,[p.slug]:e.target.value}))} autoComplete="off"/>
      {p.slug==='cloudflare' && <TextInput id="cloudflare-account-id" labelText="Cloudflare Account ID" placeholder="输入 Account ID" value={cloudflareAccountId} onChange={e=>setCloudflareAccountId(e.target.value)} />}
      {credentials.some(c=>c.slug===p.slug) && <><Select id={`model-${p.slug}`} labelText="默认模型（在这里选择）" value={selectedModels[p.slug]??''} onChange={e=>onSelectModel(p.slug,e.target.value)}><SelectItem value="" text="请选择可用模型"/>{(models[p.slug]??[]).map(model=><SelectItem key={model.id} value={model.id} text={model.name??model.id}/>)}</Select><p className="vault-model-hint">{models[p.slug]?.length?(`已发现 ${models[p.slug].length} 个模型。选择后自动保存，后续 AI 功能将使用此模型。`):'保存 API Key 和必要信息后，系统会自动获取模型并显示在此下拉框。'}</p></>}
      <div className="card-actions"><Button kind="tertiary" size="sm" onClick={()=>onSave(p.slug,p.name,'provider')} disabled={busy||!keyValues[p.slug]?.trim()}>保存凭证并获取模型</Button><Button kind="tertiary" size="sm" onClick={()=>onLoadModels(p.slug)} disabled={busy||!credentials.some(c=>c.slug===p.slug)}>刷新模型列表</Button><Button kind="secondary" size="sm" renderIcon={Renew} onClick={()=>onTest(p.slug,'provider')} disabled={busy||!credentials.some(c=>c.slug===p.slug)||!selectedModels[p.slug]}>连接测试</Button></div>
    </Tile></Column>)}</Grid></section>
    <section className="vault-section"><div className="module-heading"><div><h2>数据平台连接</h2><p>管理采集服务所需的 API 凭证。</p></div><Tag type="blue">{apiIntegrations.length} 个连接</Tag></div><Grid condensed className="vault-grid">{apiIntegrations.map(item=><Column key={item.slug} sm={4} md={4} lg={8} xlg={8}><Tile className="vault-card">
      <div className="card-head"><BrandIcon slug={item.slug} label={item.name} fallback={item.fallback} size={34}/><div><h3>{item.name}</h3><p>{item.credentialLabel}</p></div><Tag type={credentials.some(c=>c.slug===item.slug)?'green':'cool-gray'}>{credentials.some(c=>c.slug===item.slug)?'已保存':'未配置'}</Tag></div>
      <PasswordInput id={`key-${item.slug}`} labelText={item.credentialLabel} placeholder={credentials.some(c=>c.slug===item.slug)?'••••••••••••••••':item.placeholder} value={keyValues[item.slug]??''} onChange={e=>setKeyValues(v=>({...v,[item.slug]:e.target.value}))} autoComplete="off"/>
      {item.slug==='reddit' && <TextInput id="reddit-client-id" labelText="Reddit Client ID" placeholder="填写 OAuth Client ID" value={integrationMeta.reddit??''} onChange={e=>setIntegrationMeta(v=>({...v,reddit:e.target.value}))}/>}
      {item.slug==='tiktok' && <TextInput id="tiktok-client-key" labelText="TikTok Client Key" placeholder="填写 Client Key" value={integrationMeta.tiktok??''} onChange={e=>setIntegrationMeta(v=>({...v,tiktok:e.target.value}))}/>}
      <div className="card-actions"><Button kind="tertiary" size="sm" onClick={()=>onSave(item.slug,item.name,'integration')} disabled={busy||!keyValues[item.slug]?.trim()}>加密保存</Button><Button kind="secondary" size="sm" onClick={()=>onTest(item.slug,'integration')} disabled={busy||!credentials.some(c=>c.slug===item.slug)}>连接测试</Button></div>
    </Tile></Column>)}</Grid></section>
    <Tile><h3>默认模型路由</h3><Select id="default-provider" labelText="默认模型 Provider" disabled={busy} value={selectedProvider} onChange={e=>setSelectedProvider(e.target.value)}>{providers.map(p=><SelectItem key={p.slug} value={p.slug} text={p.name}/>)}</Select></Tile>
  </section>;
}
