import { useEffect, useRef, useState } from 'react';
import { useWorkspaceRoute, type WorkspacePage } from './lib/router';
import { WorkspaceNavigation } from './components/WorkspaceNavigation';
import { CredentialVault } from './features/settings/CredentialVault';
import { ImportExportLeadsFinder } from './features/leads/ImportExportLeadsFinder';
import { SocialLeadsFinder } from './features/leads/SocialLeadsFinder';
import { GlobalLeads } from './features/leads/GlobalLeads';
import {
  Header, HeaderMenuButton, HeaderName, HeaderGlobalBar, HeaderGlobalAction, Content, Grid, Column,
  InlineNotification, Loading,
} from './components/ui';
import { UserAvatar } from './components/icons';
import { useAuth } from './auth/AuthProvider';

type Credential = { slug:string; name:string; kind:'provider'|'integration'; status:string; key_last4?:string; last_validated_at?:string; account_id?:string };
type ProviderModel = { id:string; name?:string; task?:string };
const supabaseUrl=import.meta.env.VITE_SUPABASE_URL||'https://vuyyaqsmlzixhdjvaidj.supabase.co';
const fnUrl=`${supabaseUrl}/functions/v1/synesis-api`;

export default function App(){
 const {session,signOut}=useAuth();
 const route=useWorkspaceRoute();
 const page=route.page;
 const navigate=(next:WorkspacePage)=>{route.navigate(next);setNavExpanded(false);};
 const [navExpanded,setNavExpanded]=useState(false);
 const [theme,setTheme]=useState<'light'|'dark'>(()=>window.localStorage.getItem('synesis-theme')==='dark'?'dark':'light');
 const [notice,setNotice]=useState<{kind:'info'|'success'|'error'|'warning';text:string}|null>(null);
 const [busy,setBusy]=useState(false);
 const [credentials,setCredentials]=useState<Credential[]>([]);
 const [keyValues,setKeyValues]=useState<Record<string,string>>({});
 const [providerModelsList,setProviderModelsList]=useState<Record<string,ProviderModel[]>>({});
 const [selectedProviderModels,setSelectedProviderModels]=useState<Record<string,string>>({});
 const [selectedProvider,setSelectedProvider]=useState('openai');
 const [cloudflareAccountId,setCloudflareAccountId]=useState('');
 const [integrationMeta,setIntegrationMeta]=useState<Record<string,string>>({});
 const loadedProviderModels=useRef(new Set<string>());
 const providerModelLoads=useRef(new Set<string>());
 const token=session?.access_token??'';
 const headers={Authorization:`Bearer ${token}`,apikey:import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||'sb_publishable_3zXUJ5hz_1cl9sFQqPVqCQ_Tu5KfaCu','Content-Type':'application/json'};

 async function api(action:string,payload:Record<string,unknown>={}){
  const response=await fetch(fnUrl,{method:'POST',headers,body:JSON.stringify({action,...payload})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
   const detail=Array.isArray(data.validation)?data.validation.join('；'):'';
   throw new Error([data.error||`请求失败（${response.status}）`,detail].filter(Boolean).join('：'));
  }
  return data;
 }
 async function loadCredentials(){
  setBusy(true);
  try{
   const result=await api('credentials.list');
   setCredentials(result.credentials??[]);
   const active=(result.credentials??[]).find((item:Credential)=>item.kind==='provider'&&item.status==='validated');
   if(active)setSelectedProvider(active.slug);
  }catch(e){setNotice({kind:'error',text:e instanceof Error?e.message:'加载凭证失败'});}
  finally{setBusy(false);}
 }
 useEffect(()=>{void loadCredentials();},[]);
 useEffect(()=>{window.localStorage.setItem('synesis-theme',theme);},[theme]);
 useEffect(()=>{
  if(page==='vault') credentials.filter(item=>item.kind==='provider').forEach(item=>void loadProviderModels(item.slug));
 },[page,credentials]);

 async function loadProviderModels(slug:string,force=false){
  if(providerModelLoads.current.has(slug)||(!force&&loadedProviderModels.current.has(slug)))return;
  providerModelLoads.current.add(slug);setBusy(true);
  try{
   const result=await api('models.list',{slug});
   const available=(result.models??[]) as ProviderModel[];
   setProviderModelsList(v=>({...v,[slug]:available}));loadedProviderModels.current.add(slug);
   const current=String(result.selected_model??'');
   const next=available.some(item=>item.id===current)?current:(available[0]?.id??'');
   if(next){setSelectedProviderModels(v=>({...v,[slug]:next}));if(next!==current)await api('models.select',{slug,model:next});}
   else setSelectedProviderModels(v=>({...v,[slug]:''}));
  }catch(e){setNotice({kind:'error',text:`获取 ${slug} 模型列表失败：${e instanceof Error?e.message:'未知错误'}`});}
  finally{providerModelLoads.current.delete(slug);setBusy(false);}
 }
 async function saveProviderModel(slug:string,model:string){
  if(!model)return;setSelectedProviderModels(v=>({...v,[slug]:model}));
  try{await api('models.select',{slug,model});setNotice({kind:'success',text:'默认模型已保存。'});}
  catch(e){setNotice({kind:'error',text:e instanceof Error?e.message:'保存模型失败'});}
 }
 async function saveCredential(slug:string,name:string,kind:'provider'|'integration'){
  const value=keyValues[slug]?.trim();if(!value)return;
  setBusy(true);
  try{
   await api('credentials.save',{slug,name,kind,apiKey:value,accountId:slug==='cloudflare'?cloudflareAccountId.trim():undefined,metadata:kind==='integration'?(slug==='reddit'?{clientId:integrationMeta.reddit??''}:slug==='tiktok'?{clientKey:integrationMeta.tiktok??''}:{ }):{}});
   setKeyValues(v=>({...v,[slug]:''}));setNotice({kind:'success',text:`${name} 凭证已加密保存。`});
   await loadCredentials();
   if(kind==='provider')await loadProviderModels(slug,true);
  }catch(e){setNotice({kind:'error',text:e instanceof Error?e.message:'保存凭证失败'});}
  finally{setBusy(false);}
 }
 async function testConnection(slug:string,kind:'provider'|'integration'){
  setBusy(true);
  try{const result=await api('connection.test',{slug,kind,model:selectedProviderModels[slug]});setNotice({kind:'success',text:`${slug} 连接成功：${result.message??'凭证有效，服务可调用'}`});await loadCredentials();}
  catch(e){setNotice({kind:'error',text:e instanceof Error?e.message:'连接测试失败'});}
  finally{setBusy(false);}
 }
 const title=page==='vault'?'API 与 AI 配置':page==='social'?'Social Leads Finder':page==='global-leads'?'全球客户线索库':'Import Export Leads Finder';
 const description=page==='vault'?'安全管理 Apify API、其他数据连接及 AI Provider 凭证。':page==='social'?'手动选择社交平台与 Apify Actor，发现买家和企业客户。':page==='global-leads'?'统一管理跨平台、跨需求、跨来源的企业与个人客户线索。':'通过贸易记录与企业画像发现真实进口商和潜在客户。';

 return <div className={`synesis-app synesis-theme-${theme}`}>
  <Header aria-label="Synesis">
   <a className="synesis-skip-link" href="#main-content" onClick={event=>{event.preventDefault();document.getElementById('main-content')?.focus();}}>跳至主要内容</a>
   <HeaderMenuButton aria-label="切换导航" aria-expanded={navExpanded} aria-controls="synesis-navigation" isActive={navExpanded} onClick={()=>setNavExpanded(v=>!v)}/>
   <HeaderName prefix="" href="#/leads">SYNESIS</HeaderName>
   <HeaderGlobalBar>
    <HeaderGlobalAction aria-label={theme==='light'?'切换到深色主题':'切换到浅色主题'} tooltipAlignment="end" onClick={()=>setTheme(current=>current==='light'?'dark':'light')}><span aria-hidden="true">◐</span></HeaderGlobalAction>
    <HeaderGlobalAction aria-label="账户（点击退出登录）" tooltipAlignment="end" onClick={()=>void signOut()}><UserAvatar/></HeaderGlobalAction>
   </HeaderGlobalBar>
  </Header>
  <WorkspaceNavigation page={page} open={navExpanded} onNavigate={navigate} onClose={()=>setNavExpanded(false)}/>
  <Content id="main-content" tabIndex={-1} className="synesis-content">
   <Grid fullWidth className="synesis-page-grid"><Column sm={4} md={8} lg={16} xlg={16}><div className="page-wrap">
    <div className="page-heading-copy"><h1 className="page-title">{title}</h1><p className="subheading">{description}</p></div>
    {notice&&<InlineNotification kind={notice.kind} lowContrast title={notice.kind==='error'?'操作失败':notice.kind==='success'?'操作成功':'系统提示'} subtitle={notice.text} onCloseButtonClick={()=>setNotice(null)}/>}
    {busy&&<Loading small withOverlay={false} description="处理中"/>}
    {page==='leads'&&<ImportExportLeadsFinder onApi={api}/>}
    {page==='social'&&<SocialLeadsFinder onApi={api}/>}
    {page==='global-leads'&&<GlobalLeads onApi={api}/ >}
    {page==='vault'&&<CredentialVault
     credentials={credentials} keyValues={keyValues} setKeyValues={setKeyValues} busy={busy}
     cloudflareAccountId={cloudflareAccountId} setCloudflareAccountId={setCloudflareAccountId}
     integrationMeta={integrationMeta} setIntegrationMeta={setIntegrationMeta}
     providerModels={selectedProviderModels} selectedProvider={selectedProvider} setSelectedProvider={setSelectedProvider}
     models={providerModelsList} selectedModels={selectedProviderModels} onLoadModels={(slug,force)=>void loadProviderModels(slug,force)} onSelectModel={saveProviderModel}
     onSave={(slug,name,kind)=>void saveCredential(slug,name,kind)} onTest={(slug,kind)=>void testConnection(slug,kind)}
    />}
   </div></Column></Grid>
  </Content>
 </div>;
}
