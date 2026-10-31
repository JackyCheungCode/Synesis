import { useEffect, useMemo, useRef, useState } from 'react';
import { useWorkspaceRoute, type WorkspacePage } from './lib/router';
import { WorkspaceNavigation } from './components/WorkspaceNavigation';
import { ResearchWizard } from './features/research/ResearchWizard';
import {
  Header, HeaderMenuButton, HeaderName, HeaderGlobalBar, HeaderGlobalAction, Content,
  Button, InlineNotification, Tag, TextInput, PasswordInput, Tile,
  Select, SelectItem, Modal, Loading, Accordion, AccordionItem, Link,
} from '@carbon/react';
import {
  Add, Renew, Search as SearchIcon, UserAvatar,
} from '@carbon/icons-react';
import { BrandIcon } from './components/BrandIcon';
import { providers, apiIntegrations } from './data/catalog';
import { useAuth } from './auth/AuthProvider';
import { supabase } from './lib/supabase';

type Page = WorkspacePage;
type Credential = { slug: string; name: string; kind: 'provider' | 'integration'; status: string; key_last4?: string; last_validated_at?: string };
type Project = { id: string; name: string; objective: string; status: string; target_regions: string[]; platform_slugs: string[] };
type Plan = { id: string; project_id: string; status: string; plan: Record<string, unknown>; estimated_cost: number | null; created_at: string };
type Task = { id: string; project_id: string; platform_slug: string; status: string; actor_id: string | null; created_at: string; progress?: number; result_count?: number; run_status?: string | null; external_run_id?: string | null; error_message?: string | null; finished_at?: string | null; result_synced_count?: number };
type MarketReport = { id:string; title:string; status:string; created_at:string; project_id:string|null; content:Record<string,unknown> };
type Product = {id:string;canonical_key:string;title:string|null;brand:string|null;category:string|null;description:string|null;image_url:string|null;updated_at:string};
type ProductHistory = {id:string;price:number;currency:string;observed_at:string;source_task_id:string;source?:{platform_slug:string;external_product_id:string;source_url:string}|null};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vuyyaqsmlzixhdjvaidj.supabase.co';
const fnUrl = `${supabaseUrl}/functions/v1/synesis-api`;
const providerModels: Record<string, string> = {
  openai: 'gpt-4.1-mini', googlegemini: 'gemini-2.5-flash', deepseek: 'deepseek-chat',
  anthropic: 'claude-3-7-sonnet-latest', cloudflare: '@cf/meta/llama-3.3-70b-instruct',
  mistral: 'mistral-small-latest', x: 'grok-3-mini',
};

function App() {
  const { session, signOut } = useAuth();
  const route = useWorkspaceRoute();
  const page = route.page;
  const projectId = route.projectId;
  const navigate = (next: Page, id?: string) => { route.navigate(next, id); setNavExpanded(false); };
  const [navExpanded, setNavExpanded] = useState(false);
  const [notice, setNotice] = useState<{kind:'info'|'success'|'error'|'warning'; text:string}|null>(null);
  const [busy, setBusy] = useState(false);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reports, setReports] = useState<MarketReport[]>([]);
  const [resultTask, setResultTask] = useState<Task|null>(null);
  const [taskResults, setTaskResults] = useState<unknown[]>([]);
  const [resultPage, setResultPage] = useState(0);
  const [resultTotal, setResultTotal] = useState(0);
  const [resultSynced, setResultSynced] = useState(0);
  const [analyticsTaskId, setAnalyticsTaskId] = useState('');
  const [analytics, setAnalytics] = useState<any>(null);
  const [keyValues, setKeyValues] = useState<Record<string,string>>({});
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [approvalPlan, setApprovalPlan] = useState<Plan|null>(null);
  const [cloudflareAccountId, setCloudflareAccountId] = useState('');
  const [integrationMeta, setIntegrationMeta] = useState<Record<string,string>>({});
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [productSearch,setProductSearch]=useState('');
  const [products,setProducts]=useState<Product[]>([]);
  const [productTotal,setProductTotal]=useState(0);
  const [productOffset,setProductOffset]=useState(0);
  const [selectedProduct,setSelectedProduct]=useState<Product|null>(null);
  const [productHistory,setProductHistory]=useState<ProductHistory[]>([]);
  const [productHistoryTotal,setProductHistoryTotal]=useState(0);
  const [productHistoryOffset,setProductHistoryOffset]=useState(0);
  const [cancelTaskTarget,setCancelTaskTarget]=useState<Task|null>(null);

  const token = session?.access_token ?? '';
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_3zXUJ5hz_1cl9sFQqPVqCQ_Tu5KfaCu', 'Content-Type': 'application/json' }), [token]);

  async function api(action: string, payload: Record<string,unknown> = {}) {
    const response = await fetch(fnUrl, { method:'POST', headers, body: JSON.stringify({ action, ...payload }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `请求失败（${response.status}）`);
    return data;
  }

  async function loadAll() {
    setBusy(true);
    try {
      const [p, pl, t, c, r] = await Promise.all([
        supabase.from('research_projects').select('id,name,objective,status,target_regions,platform_slugs').order('updated_at',{ascending:false}),
        supabase.from('ai_research_plans').select('id,project_id,status,plan,estimated_cost,created_at').order('created_at',{ascending:false}),
        supabase.from('collection_tasks').select('id,project_id,platform_slug,status,actor_id,created_at,progress,result_count,result_synced_count,run_status,external_run_id,error_message,finished_at').order('created_at',{ascending:false}),
        api('credentials.list'),
        supabase.from('market_reports').select('id,title,status,created_at,project_id,content').order('created_at',{ascending:false}),
      ]);
      if (p.error) throw p.error; if (pl.error) throw pl.error; if (t.error) throw t.error; if (r.error) throw r.error;
      setProjects(p.data ?? []); setPlans(pl.data ?? []); setTasks(t.data ?? []); setCredentials(c.credentials ?? []); setReports(r.data ?? []); const activeProvider=(c.credentials??[]).find((item:Credential)=>item.kind==='provider'&&item.status==='validated'); if(activeProvider) setSelectedProvider(activeProvider.slug);
    } catch (e) { setNotice({kind:'error',text: message(e)}); }
    finally { setBusy(false); }
  }
  useEffect(() => { void loadAll(); }, []);
  useEffect(() => { if (page === 'products') void loadProducts(0); }, [page]);

  async function saveCredential(slug: string, name: string, kind: 'provider'|'integration') {
    const value = keyValues[slug]?.trim();
    if (!value) return;
    setBusy(true);
    try {
      await api('credentials.save', { slug, name, kind, apiKey:value, accountId: slug === 'cloudflare' ? cloudflareAccountId.trim() : undefined, metadata: kind === 'integration' ? (slug === 'reddit' ? { clientId: integrationMeta.reddit ?? '' } : slug === 'tiktok' ? { clientKey: integrationMeta.tiktok ?? '' } : {}) : {} });
      setKeyValues(v => ({...v,[slug]:''}));
      setNotice({kind:'success',text:`${name} 凭证已加密保存。现在可以执行连接测试。`});
      await loadAll();
    } catch(e) { setNotice({kind:'error',text:message(e)}); }
    finally { setBusy(false); }
  }
  async function testConnection(slug: string, kind: 'provider'|'integration') {
    setBusy(true);
    try {
      const result = await api('connection.test',{slug,kind,model:providerModels[slug]});
      setNotice({kind:'success',text:`${slug} 连接成功：${result.message ?? '凭证有效，服务可调用'}`});
      await loadAll();
    } catch(e) { setNotice({kind:'error',text:message(e)}); }
    finally { setBusy(false); }
  }
  async function createProject(brief: string) {
    const researchBrief = brief.trim();
    if (!researchBrief) return;
    if (!credentials.some(item=>item.kind==='provider'&&item.status==='validated')) { setNotice({kind:'warning',text:'请先在 AI 模型与 Key Vault 配置并验证一个 AI Provider。'}); return; }
    setBusy(true);
    try {
      const {data,error} = await supabase.from('research_projects').insert({
        name:researchBrief.length > 56 ? researchBrief.slice(0,56) + '…' : researchBrief,
        objective:researchBrief, target_regions:[], platform_slugs:[], scope:{input_mode:'natural_language'}, status:'planning',
      }).select().single();
      if(error) throw error;
      navigate('projects', data.id);
      await api('plans.generate',{projectId:data.id,provider:selectedProvider});
      setNotice({kind:'success',text:'研究需求已提交，AI 正在生成采集计划。'});
      await loadAll();
    } catch(e) { setNotice({kind:'error',text:message(e)}); }
    finally { setBusy(false); }
  }
  async function approvePlan(plan: Plan) {
    setBusy(true);
    try {
      await api('plans.approve',{planId:plan.id});
      const {data:queued,error}=await supabase.from('collection_tasks')
        .select('id').eq('plan_id',plan.id).eq('status','queued').eq('user_id',session?.user.id);
      if(error) throw error;
      const starts = await Promise.allSettled((queued ?? []).map(task=>api('tasks.execute',{taskId:task.id})));
      setApprovalPlan(null);
      setNotice({kind:starts.some(item=>item.status==='rejected')?'warning':'success',text:`采集计划已批准，已提交 ${queued?.length ?? 0} 个 Apify 任务。系统将自动跟踪运行和结果同步。`});
      await loadAll(); navigate('projects',plan.project_id);
    } catch(e) { setNotice({kind:'error',text:message(e)}); }
    finally { setBusy(false); }
  }
  async function retryTask(task: Task) {
    setBusy(true);
    try {
      await api('tasks.retry',{taskId:task.id});
      setNotice({kind:'success',text:'已创建新的待执行重试任务，原失败记录会保留。'});
      await loadAll();
    } catch(e) { setNotice({kind:'error',text:message(e)}); }
    finally { setBusy(false); }
  }

  function cancelTask(task:Task) {
    setCancelTaskTarget(task);
  }

  async function confirmCancelTask() {
    if (!cancelTaskTarget) return;
    setBusy(true);
    try {
      await api('tasks.cancel',{taskId:cancelTaskTarget.id});
      setCancelTaskTarget(null);
      setNotice({kind:'success',text:'取消请求已处理。'});
      await loadAll();
    } catch(e) { setNotice({kind:'error',text:message(e)}); }
    finally { setBusy(false); }
  }

  async function syncTask(task: Task) {
    setBusy(true);
    try {
      let result: any;
      let batches = 0;
      do {
        result = await api('tasks.sync',{taskId:task.id});
        batches += 1;
        const synced = Number(result.task?.result_synced_count ?? 0);
        const total = Number(result.task?.result_count ?? 0);
        setNotice({kind:'info',text:`正在完整接收采集结果：${synced.toLocaleString()} / ${total.toLocaleString()} 条（第 ${batches} 批）`});
        if (result.task?.run_status !== 'SUCCEEDED' || result.task?.result_sync_complete || batches >= 50) break;
      } while (true);
      const complete = Boolean(result.task?.result_sync_complete);
      const state = result.task?.run_status ?? result.task?.status ?? '未知';
      const count = Number(result.task?.result_count ?? 0);
      const synced = Number(result.task?.result_synced_count ?? 0);
      setNotice({kind:complete?'success':'info',text:`任务状态：${state}；已同步 ${synced.toLocaleString()} / ${count.toLocaleString()} 条。${complete?'全部结果已保存。':'本轮达到安全批次上限，可再次点击继续同步。'}`});
      await loadAll();
    } catch(e) { setNotice({kind:'error',text:message(e)}); }
    finally { setBusy(false); }
  }
  async function viewTaskResults(task: Task, page = 0) {
    setBusy(true);
    try {
      const result = await api('tasks.results',{taskId:task.id,limit:100,offset:page*100});
      setTaskResults(result.results ?? []);
      setResultPage(page);
      setResultTotal(Number(result.total ?? 0));
      setResultSynced(Number(result.synced ?? 0));
      setResultTask(task);
    } catch(e) { setNotice({kind:'error',text:message(e)}); }
    finally { setBusy(false); }
  }

  async function saveAnalyticsReport() {
    const task=tasks.find(item=>item.id===analyticsTaskId);
    if(!task||!analytics||!session?.user.id) return;
    setBusy(true);
    try {
      const now=new Date().toISOString();
      const {error}=await supabase.from('market_reports').insert({
        user_id:session.user.id,project_id:task.project_id,
        title:`${task.platform_slug} 产品数据分析 · ${now.slice(0,10)}`,report_type:'dataset_analytics',
        content:analytics,evidence:[{task_id:task.id,platform_slug:task.platform_slug,result_count:task.result_count,result_synced_count:task.result_synced_count}],
        status:'generated',generated_at:now,
      });
      if(error) throw error;
      setNotice({kind:'success',text:'分析快照已保存到市场研究报告。'});
      await loadAll();
    } catch(e) { setNotice({kind:'error',text:message(e)}); }
    finally { setBusy(false); }
  }

  async function loadAnalytics(taskId: string) {
    if (!taskId) return;
    setBusy(true);
    try { const data = await api('tasks.analytics',{taskId}); setAnalytics(data); setAnalyticsTaskId(taskId); }
    catch(e) { setNotice({kind:'error',text:message(e)}); }
    finally { setBusy(false); }
  }

  async function loadProducts(offset=0,searchValue=productSearch) {
    setBusy(true);
    try {
      const data=await api('products.list',{limit:25,offset,search:searchValue});
      setProducts(data.products??[]);setProductTotal(data.total??0);setProductOffset(offset);
    } catch(e) { setNotice({kind:'error',text:message(e)}); }
    finally { setBusy(false); }
  }

  async function loadProductHistory(product:Product,offset=0) {
    setBusy(true);
    try {
      const data=await api('products.history',{productId:product.id,limit:50,offset});
      setSelectedProduct(product);setProductHistory(data.history??[]);
      setProductHistoryTotal(data.total??0);setProductHistoryOffset(offset);
    } catch(e) { setNotice({kind:'error',text:message(e)}); }
    finally { setBusy(false); }
  }

  const autoReportProjects = useRef(new Set<string>());
  async function generateResearchReport(projectId: string) {
    if (!session?.user.id) return;
    const project = projects.find(item=>item.id===projectId);
    const projectTasks = tasks.filter(item=>item.project_id===projectId);
    if (!project || !projectTasks.length || projectTasks.some(item=>item.status!=='succeeded' || Number(item.result_synced_count??0)<Number(item.result_count??0))) return;
    const analyses = await Promise.all(projectTasks.map(async task=>({platform:task.platform_slug,taskId:task.id,analysis:await api('tasks.analytics',{taskId:task.id})})));
    const response = await api('ai.invoke',{provider:selectedProvider,model:providerModels[selectedProvider],messages:[
      {role:'system',content:'你是 Synesis 的跨境市场研究分析师。请只根据提供的实际采集统计数据撰写中文研究报告。区分事实、推断和建议；不得推断未提供的销量、市场规模或利润。返回 JSON，字段包括 executive_summary、market_insights、competitive_analysis、price_analysis、customer_feedback、opportunities、risks、recommendations、limitations。'},
      {role:'user',content:JSON.stringify({research_objective:project.objective,target_regions:project.target_regions,platforms:project.platform_slugs,data:analyses})}
    ]});
    const raw = extractAIText(response.result,selectedProvider);
    let content:Record<string,unknown>;
    try { content=JSON.parse(raw); } catch { content={executive_summary:raw,analysis_format:'plain_text'}; }
    const {error}=await supabase.from('market_reports').insert({
      user_id:session.user.id,project_id:projectId,title:`${project.name} · AI 研究报告`,
      report_type:'market_research',content,evidence:analyses.map(item=>({task_id:item.taskId,platform_slug:item.platform})),
      status:'generated',generated_at:new Date().toISOString(),
    });
    if(error) throw error;
    await supabase.from('research_projects').update({status:'completed'}).eq('id',projectId).eq('user_id',session.user.id);
    await loadAll();
    setNotice({kind:'success',text:'数据已完整同步，AI 研究报告已生成并保存。'});
  }

  useEffect(() => {
    const active = tasks.filter(task=>task.status==='running' || (task.status==='succeeded' && Number(task.result_synced_count??0)<Number(task.result_count??0)));
    if (!active.length) return;
    const timer = window.setInterval(async()=>{
      for (const task of active) {
        try { await api('tasks.sync',{taskId:task.id}); } catch { /* transient sync conflicts are retried on the next poll */ }
      }
      await loadAll();
    },12000);
    return ()=>window.clearInterval(timer);
  },[tasks,token]);

  useEffect(() => {
    const ready = projects.filter(project=>{
      const projectTasks=tasks.filter(task=>task.project_id===project.id);
      return projectTasks.length>0 && projectTasks.every(task=>task.status==='succeeded' && Number(task.result_synced_count??0)>=Number(task.result_count??0))
        && !reports.some(report=>report.project_id===project.id) && !autoReportProjects.current.has(project.id);
    });
    for (const project of ready) {
      autoReportProjects.current.add(project.id);
      void generateResearchReport(project.id).catch(error=>{
        autoReportProjects.current.delete(project.id);
        setNotice({kind:'error',text:`数据已汇总，但 AI 报告生成失败：${message(error)}。检查 AI Provider 配置后可重试。`});
      });
    }
  },[projects,tasks,reports,selectedProvider,session?.user.id]);

  async function exportTaskResults(task: Task) {
    setBusy(true);
    try {
      const rows: Record<string, unknown>[] = [];
      const total = Number(task.result_synced_count ?? task.result_count ?? 0);
      for (let offset=0; offset<total; offset+=250) {
        const page = await api('tasks.results',{taskId:task.id,limit:250,offset});
        rows.push(...(page.results ?? []));
      }
      const keys = Array.from(new Set(rows.flatMap(row=>Object.keys(row))));
      const csvCell = (value: unknown) => {
        const raw = value !== null && typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
        const first = raw.charCodeAt(0);
        const text = '=+-@'.includes(raw[0] ?? '') || first === 9 || first === 13 ? `'${raw}` : raw;
        return `"${text.replace(/"/g,'""')}"`;
      };
      const csv = [keys.map(csvCell).join(','),...rows.map(row=>keys.map(key=>csvCell(row[key])).join(','))].join('\\r\\n');
      const blob = new Blob(['\\uFEFF',csv],{type:'text/csv;charset=utf-8;'});
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href=url; link.download=`synesis-task-${task.id}-results.csv`; link.click();
      URL.revokeObjectURL(url);
      setNotice({kind:'success',text:`已导出 ${rows.length.toLocaleString()} 条已接收的原始记录。`});
    } catch(e) { setNotice({kind:'error',text:message(e)}); }
    finally { setBusy(false); }
  }

  const title: Record<Page,string> = {dashboard:'情报总览',vault:'AI 模型与 Key Vault',projects:projectId?'研究项目详情':'研究项目中心',products:'标准化商品库'};
  const pendingPlans = plans.filter(p => p.status === 'pending_approval');

  return (
    <div className="synesis-app cds--white">
      <Header aria-label="Synesis">
        <HeaderMenuButton aria-label="切换导航" isActive={navExpanded} onClick={() => setNavExpanded(v=>!v)} />
        <HeaderName prefix="" href="#" onClick={e=>e.preventDefault()}>SYNESIS</HeaderName>
        <HeaderGlobalBar>
          <HeaderGlobalAction aria-label="搜索" tooltipAlignment="end" onClick={()=>setSearchOpen(true)}><SearchIcon/></HeaderGlobalAction>
          <HeaderGlobalAction aria-label="账户（点击退出登录）" tooltipAlignment="end" onClick={()=>void signOut()}><UserAvatar/></HeaderGlobalAction>
        </HeaderGlobalBar>
      </Header>
      <WorkspaceNavigation page={page} open={navExpanded} onNavigate={(target)=>navigate(target)} onClose={()=>setNavExpanded(false)}/>
      <Content className="synesis-content">
        <div className="page-wrap">
          <div className="page-title-row"><div><p className="eyebrow">SYNESIS / WORKSPACE</p><h1>{title[page]}</h1><p className="subheading">全球商业数据 · 跨平台情报 · AI 驱动研究</p></div><Tag type="blue">个人工作空间</Tag></div>
          {notice && <InlineNotification kind={notice.kind} lowContrast title={notice.kind==='error'?'操作失败':notice.kind==='success'?'操作成功':'系统提示'} subtitle={notice.text} onCloseButtonClick={()=>setNotice(null)}/>}
          {busy && <Loading small withOverlay={false} description="处理中"/>}
          {page==='dashboard' && <div className="carbon-grid">
            <Tile><div className="metric-label">研究项目</div><div className="metric-value">{projects.length}</div><p>已建立的研究项目</p></Tile>
            <Tile><div className="metric-label">待审批研究计划</div><div className="metric-value">{pendingPlans.length}</div><p>人工批准前不会启动采集</p></Tile>
            <Tile><div className="metric-label">采集任务</div><div className="metric-value">{tasks.length}</div><p>Apify 任务运行记录</p></Tile>
            <Tile><div className="metric-label">已配置凭证</div><div className="metric-value">{credentials.length}</div><p>密钥仅在后端加密保存</p></Tile>
            <Tile className="wide-tile"><h3>研究流程</h3><div className="flow-steps"><Tag type="blue">创建项目</Tag><span>→</span><Tag type="blue">AI 生成计划</Tag><span>→</span><Tag type="warm-gray">人工审批</Tag><span>→</span><Tag type="cool-gray">Apify 采集</Tag><span>→</span><Tag type="cool-gray">报告</Tag></div><p>只有明确批准的研究计划，才能创建采集任务；任务执行接口还会再次检查批准状态。</p><Button kind="primary" renderIcon={Add} onClick={()=>navigate('projects')}>创建研究项目</Button></Tile>
          </div>}
          {page==='vault' && <section className="module-stack">
            <div className="module-heading"><div><h2>AI Provider API Keys</h2><p>输入后立即发送到认证后端，采用 AES-GCM 加密保存。不会写入 localStorage、sessionStorage 或前端环境变量。</p></div><Tag type="green">BYOK</Tag></div>
            <section><h3>AI 模型</h3><div className="vault-grid">{providers.map(p=><Tile key={p.slug} className="vault-card">
              <div className="card-head"><BrandIcon slug={p.slug} label={p.name} fallback={p.fallback} size={34}/><div><h3>{p.name}</h3><p>{providerModels[p.slug] ?? '模型可在路由配置中指定'}</p></div><Tag type={credentials.some(c=>c.slug===p.slug)?'green':'cool-gray'}>{credentials.find(c=>c.slug===p.slug)?.status==='validated'?'已验证':credentials.some(c=>c.slug===p.slug)?'已保存':'未配置'}</Tag></div>
              <PasswordInput id={`key-${p.slug}`} labelText={p.slug==='cloudflare'?'Cloudflare API Token':'API Key'} placeholder="粘贴 API Key" value={keyValues[p.slug]??''} onChange={e=>setKeyValues(v=>({...v,[p.slug]:e.target.value}))} autoComplete="off"/>
              {p.slug==='cloudflare' && <TextInput id="cloudflare-account-id" labelText="Cloudflare Account ID" placeholder="输入 Account ID" value={cloudflareAccountId} onChange={e=>setCloudflareAccountId(e.target.value)} />} 
              <div className="card-actions"><Button kind="tertiary" size="sm" onClick={()=>void saveCredential(p.slug,p.name,'provider')} disabled={!keyValues[p.slug]?.trim()}>加密保存</Button><Button kind="secondary" size="sm" renderIcon={Renew} onClick={()=>void testConnection(p.slug,'provider')} disabled={!credentials.some(c=>c.slug===p.slug)}>连接测试</Button></div>
            </Tile>)}</div></section><section><h3>平台与外部 API</h3><div className="vault-grid">{apiIntegrations.map(s=><Tile key={s.slug} className="vault-card">
              <div className="card-head"><BrandIcon slug={s.slug} label={s.name} fallback={s.fallback} size={34}/><div><h3>{s.name}</h3><p>{s.credentialLabel}</p></div><Tag type={credentials.some(c=>c.slug===s.slug)?'green':'cool-gray'}>{credentials.some(c=>c.slug===s.slug)?'已保存':'未配置'}</Tag></div>
              <PasswordInput id={`key-${s.slug}`} labelText={s.credentialLabel} placeholder={s.placeholder} value={keyValues[s.slug]??''} onChange={e=>setKeyValues(v=>({...v,[s.slug]:e.target.value}))} autoComplete="off"/>
              {s.slug==='reddit' && <TextInput id="reddit-client-id" labelText="Reddit Client ID" placeholder="填写 OAuth Client ID" value={integrationMeta.reddit??''} onChange={e=>setIntegrationMeta(v=>({...v,reddit:e.target.value}))}/>}
              {s.slug==='tiktok' && <TextInput id="tiktok-client-key" labelText="TikTok Client Key" placeholder="填写 Client Key" value={integrationMeta.tiktok??''} onChange={e=>setIntegrationMeta(v=>({...v,tiktok:e.target.value}))}/>}
              <div className="card-actions"><Button kind="tertiary" size="sm" onClick={()=>void saveCredential(s.slug,s.name,'integration')} disabled={!keyValues[s.slug]?.trim()}>加密保存</Button><Button kind="secondary" size="sm" onClick={()=>void testConnection(s.slug,'integration')} disabled={!credentials.some(c=>c.slug===s.slug)}>连接测试</Button></div>
            </Tile>)}</div></section>
            <Tile><h3>统一 AI 模型路由</h3><p>系统通过单一后端入口路由至 OpenAI、Gemini、DeepSeek、Claude、Workers AI。各供应商凭证独立保存，按用户隔离。</p><Select id="default-provider" labelText="默认模型 Provider" value={selectedProvider} onChange={e=>setSelectedProvider(e.target.value)}>{providers.map(p=><SelectItem key={p.slug} value={p.slug} text={p.name}/>)}</Select></Tile>
          </section>}
          {page==='projects' && <ResearchWizard
            projects={projects} plans={plans} tasks={tasks} reports={reports} projectId={projectId} busy={busy}
            onCreate={(brief)=>void createProject(brief)}
            onOpen={(id)=>navigate('projects',id)}
            onBack={()=>navigate('projects')}
            onApprove={(plan)=>setApprovalPlan(plan)}
            onCancel={(task)=>cancelTask(task)}
            onRetry={(task)=>void retryTask(task)}
            onSync={(task)=>void syncTask(task)}
            onView={(task)=>void viewTaskResults(task)}
            onAnalyze={(task)=>void loadAnalytics(task.id)}
          />}
          {page==='projects' && analytics && <section className="module-stack"><AnalyticsDashboard data={analytics}/><Button kind="secondary" onClick={()=>void saveAnalyticsReport()} disabled={busy}>保存数据分析快照</Button></section>}
          {page==='products' && <section className="module-stack">
            <Tile>
              <div className="module-heading"><div><h2>跨平台商品目录</h2><p>统一查看采集任务中识别的商品主档、来源平台与历史价格。原始采集记录仍独立保留。</p></div><Tag type="blue">{productTotal.toLocaleString()} 件商品</Tag></div>
              <div className="product-search-row"><TextInput id="product-search" labelText="搜索商品" placeholder="商品名称、品牌或平台商品标识" value={productSearch} onChange={e=>setProductSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void loadProducts(0,productSearch);}}/><Button kind="primary" onClick={()=>void loadProducts(0,productSearch)} disabled={busy}>搜索</Button><Button kind="tertiary" renderIcon={Renew} onClick={()=>void loadProducts(productOffset)} disabled={busy}>刷新</Button></div>
            </Tile>
            <div className="product-grid">{products.map(product=><Tile key={product.id} className="product-tile">
              {product.image_url&&<img className="product-image" src={product.image_url} alt="" loading="lazy" onError={e=>{e.currentTarget.style.display='none';}}/>}
              <div><h3>{product.title||'未命名商品'}</h3><p>{product.brand||'品牌未知'} · {product.category||'未分类'}</p><small>{product.canonical_key}</small></div>
              <Button kind="tertiary" size="sm" onClick={()=>void loadProductHistory(product)}>查看价格历史</Button>
            </Tile>)}</div>
            <div className="card-actions"><Button kind="secondary" size="sm" disabled={productOffset===0||busy} onClick={()=>void loadProducts(Math.max(0,productOffset-25))}>上一页</Button><Tag type="blue">{productTotal?Math.floor(productOffset/25)+1:0} / {Math.max(1,Math.ceil(productTotal/25))}</Tag><Button kind="secondary" size="sm" disabled={productOffset+25>=productTotal||busy} onClick={()=>void loadProducts(productOffset+25)}>下一页</Button></div>
            {selectedProduct&&<Tile className="history-tile"><div className="module-heading"><div><h2>{selectedProduct.title||'商品'} · 价格历史</h2><p>{selectedProduct.canonical_key}</p></div><Button kind="ghost" onClick={()=>{setSelectedProduct(null);setProductHistory([]);}}>关闭</Button></div>
              {productHistory.length?<><div className="history-table-wrap"><table className="task-table"><thead><tr><th>采集时间</th><th>价格</th><th>币种</th><th>来源平台</th><th>平台商品 ID</th></tr></thead><tbody>{productHistory.map(item=><tr key={item.id}><td>{new Date(item.observed_at).toLocaleString()}</td><td>{Number(item.price).toLocaleString(undefined,{maximumFractionDigits:4})}</td><td>{item.currency}</td><td>{item.source?.platform_slug||'—'}</td><td>{item.source?.source_url?<Link href={item.source.source_url} target="_blank">{item.source.external_product_id}</Link>:item.source?.external_product_id||'—'}</td></tr>)}</tbody></table></div>
              <div className="card-actions"><Button kind="secondary" size="sm" disabled={productHistoryOffset===0||busy} onClick={()=>void loadProductHistory(selectedProduct,Math.max(0,productHistoryOffset-50))}>上一页</Button><Tag>{productHistoryOffset+1}–{Math.min(productHistoryOffset+50,productHistoryTotal)} / {productHistoryTotal}</Tag><Button kind="secondary" size="sm" disabled={productHistoryOffset+50>=productHistoryTotal||busy} onClick={()=>void loadProductHistory(selectedProduct,productHistoryOffset+50)}>下一页</Button></div></>:<p>暂无价格快照。需要采集记录包含可识别的价格与币种。</p>}
            </Tile>}
            {!products.length&&<Tile><p>暂时没有标准化商品。完成采集任务并成功同步结果后，符合身份识别条件的商品会自动进入商品库。</p></Tile>}
          </section>}
        </div>
      </Content>
      {searchOpen && <Modal open modalHeading="全局搜索" primaryButtonText="完成" secondaryButtonText="清除" onRequestClose={()=>setSearchOpen(false)} onRequestSubmit={()=>setSearchOpen(false)} onSecondarySubmit={()=>setSearch('')}>
        <TextInput id="global-search" labelText="搜索平台、商品、项目与情报" placeholder="输入关键词" value={search} onChange={e=>setSearch(e.target.value)}/>
      </Modal>}
      {cancelTaskTarget && <Modal open modalHeading="确认取消采集任务" primaryButtonText="确认取消任务" secondaryButtonText="保留任务" onRequestClose={()=>setCancelTaskTarget(null)} onRequestSubmit={()=>void confirmCancelTask()} primaryButtonDisabled={busy}>
        <p>确定取消这个采集任务？正在运行的 Apify Run 也会尝试终止。已接收的结果会保留。</p>
      </Modal>}
      {resultTask && <Modal open modalHeading={`采集结果 · ${resultTask.platform_slug}`} passiveModal primaryButtonText="关闭" onRequestClose={()=>setResultTask(null)}>
        <p>任务 ID：{resultTask.id} · 当前页显示 {taskResults.length} 条；总计 {resultTotal.toLocaleString()} 条，已同步 {resultSynced.toLocaleString()} 条。</p>
        <div className="card-actions"><Button kind="secondary" size="sm" disabled={resultPage===0} onClick={()=>void viewTaskResults(resultTask,resultPage-1)}>上一页</Button><Tag type="blue">第 {resultPage+1} / {Math.max(1,Math.ceil(resultTotal/100))} 页</Tag><Button kind="secondary" size="sm" disabled={(resultPage+1)*100>=resultSynced} onClick={()=>void viewTaskResults(resultTask,resultPage+1)}>下一页</Button><Button kind="tertiary" size="sm" onClick={()=>void exportTaskResults(resultTask)}>导出已接收 CSV</Button></div><RawResultsTable rows={taskResults}/><Accordion><AccordionItem title="查看完整原始 JSON"><pre className="result-json">{JSON.stringify(taskResults,null,2)}</pre></AccordionItem></Accordion>
      </Modal>}
      {approvalPlan && <Modal open modalHeading="确认 Apify 数据采集" primaryButtonText="批准并自动开始采集" secondaryButtonText="返回" onRequestClose={()=>setApprovalPlan(null)} onRequestSubmit={()=>void approvePlan(approvalPlan)} primaryButtonDisabled={busy}>
        <p>{String(approvalPlan.plan.executive_summary??'请确认本次研究计划的采集范围。批准后 Synesis 将自动启动已验证的 Apify 任务，并继续执行数据同步。')}</p>
        <h4>采集任务</h4>
        {(Array.isArray(approvalPlan.plan.platform_tasks)?approvalPlan.plan.platform_tasks:[]).map((item:any,index:number)=><div className="research-plan-row" key={index}><b>{String(item.platform_slug??'未知平台')} · {String(item.actor_title??'Apify Actor')}</b><p>{String(item.purpose??'按研究目标采集数据')}</p><Tag type="green">输入 Schema 已校验</Tag>{item.actor_rating&&<span> · 评分 {String(item.actor_rating)}</span>}</div>)}
        <p>预计费用：{approvalPlan.estimated_cost===null?'暂不可估算':`$ ${Number(approvalPlan.estimated_cost).toFixed(2)}`}</p>
        <p className="subheading">批准后，采集、结果同步和后续研究步骤将自动推进。</p>
      </Modal>}
    </div>
  );
}



function RawResultsTable({rows}:{rows:unknown[]}) {
  const records=rows.filter((row):row is Record<string,unknown>=>typeof row==='object'&&row!==null&&!Array.isArray(row));
  const columns=Array.from(new Set(records.flatMap(row=>Object.keys(row))));
  const format=(value:unknown)=>value!==null&&typeof value==='object'?JSON.stringify(value):String(value??'—');
  if(!records.length) return <p>当前页暂无结果记录。</p>;
  return <div className="raw-results-wrap"><table className="raw-results-table"><thead><tr>{columns.map(key=><th key={key}>{key}</th>)}</tr></thead><tbody>{records.map((row,index)=><tr key={index}>{columns.map(key=><td key={key} title={format(row[key])}>{format(row[key])}</td>)}</tr>)}</tbody></table></div>;
}

function AnalyticsDashboard({data}:{data:any}) {
  const metrics=data.metrics??{}, coverage=data.coverage??{}, bands=data.distributions?.price_bands??[];
  const bandsByCurrency=data.distributions?.price_bands_by_currency??[];
  const maxBand=Math.max(1,...bands.map((x:any)=>x.count),...bandsByCurrency.flatMap((g:any)=>g.bands.map((x:any)=>x.count))), words=data.distributions?.words??[];
  const brands=data.distributions?.brands??[], categories=data.distributions?.categories??[], funnel=data.funnel??{};
  const trends=data.trends??[];
  const maxTrend=Math.max(1,...trends.map((point:any)=>point.count));
  const trendCoordinates=trends.map((point:any,index:number)=>{
    const x=24+(trends.length<=1?0:index*552/(trends.length-1));
    const y=176-(point.count/maxTrend)*148;
    return x+','+y;
  }).join(' ');
  const pieRows=categories.slice(0,6);
  const pieTotal=Math.max(1,pieRows.reduce((sum:number,row:any)=>sum+row.count,0));
  const circumference=2*Math.PI*42;
  let pieOffset=0;
  const pieSlices=pieRows.map((row:any,index:number)=>{const length=row.count/pieTotal*circumference;const slice={...row,length,offset:pieOffset,index};pieOffset+=length;return slice;});
  const stages=[['全部记录',funnel.total??0],['有商品标题',funnel.titled??0],['有价格',funnel.priced??0],['有评分',funnel.rated??0],['有图片',funnel.imaged??0],['有商品链接',funnel.linked??0]];
  const money=(n:number|null)=>n===null||n===undefined?'—':n.toLocaleString(undefined,{maximumFractionDigits:2});
  return <section className="module-stack analytics-stack">
    {!coverage.complete && <InlineNotification kind="warning" lowContrast title="分析覆盖范围提示" subtitle={`当前分析 ${coverage.analyzed.toLocaleString()} / ${coverage.available.toLocaleString()} 条记录。明细仍完整保存，单次统计最多扫描 25,000 条。`}/>}
    <div className="analytics-kpis">
      <Tile><span className="metric-label">分析商品数</span><strong className="metric-value">{coverage.analyzed.toLocaleString()}</strong></Tile>
      <Tile><span className="metric-label">平均价格{metrics.price_comparable&&metrics.price_currency?' · '+metrics.price_currency:''}</span><strong className="metric-value">{metrics.price_comparable?money(metrics.average_price):'多币种'}</strong><p>{metrics.price_comparable?'同币种有效价格 '+(metrics.comparable_price_count??0)+' 条':(metrics.price_count??0)+' 条价格按币种分别统计，暂不计算混合均价'}</p></Tile>
      <Tile><span className="metric-label">价格中位数</span><strong className="metric-value">{money(metrics.median_price)}</strong><p>P25 {money(metrics.p25_price)} · P75 {money(metrics.p75_price)}</p></Tile>
      <Tile><span className="metric-label">平均评分</span><strong className="metric-value">{money(metrics.average_rating)}</strong><p>有效评分 {metrics.rating_count??0} 条</p></Tile>
      <Tile><span className="metric-label">平均评论数</span><strong className="metric-value">{money(metrics.average_reviews)}</strong></Tile>
    </div>
    <div className="analytics-grid">
      <Tile className="analytics-card"><h3>价格区间分布</h3>{bandsByCurrency.length>0?<div className="currency-band-groups">{bandsByCurrency.map((group:any)=><div className="currency-band-group" key={group.currency}><h4>{group.currency}</h4><div className="bar-chart">{group.bands.map((b:any)=><div className="bar-row" key={b.label}><span>{b.label}</span><div className="bar-track"><div className="bar-fill" style={{width:`${b.count/maxBand*100}%`}}/></div><b>{b.count}</b></div>)}</div></div>)}</div>:<p>暂无可用于价格区间分析的有效数据。</p>}</Tile>
      <Tile className="analytics-card trend-card"><h3>商品采集时间趋势 · 折线图</h3>{trends.length>1?<><svg viewBox="0 0 600 205" role="img" aria-label="按商品源时间字段统计的每日商品数量趋势"><line x1="24" y1="28" x2="24" y2="176" stroke="var(--cds-border-strong)"/><line x1="24" y1="176" x2="576" y2="176" stroke="var(--cds-border-strong)"/><polyline points={trendCoordinates} fill="none" stroke="#0f62fe" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>{trends.map((point:any,index:number)=><circle key={point.date} cx={24+(trends.length<=1?0:index*552/(trends.length-1))} cy={176-(point.count/maxTrend)*148} r="3.5" fill="#0f62fe"/>)}</svg><div className="trend-axis"><span>{trends[0].date}</span><span>{trends[trends.length-1].date}</span></div><p>按原始记录中的日期、创建时间、发布时间或采集时间字段分组。</p></>:<p>当前数据集没有足够的可识别源时间字段，暂不绘制趋势线；不会用同步时间伪造商品趋势。</p>}</Tile>
      <Tile className="analytics-card"><h3>数据采集漏斗</h3><div className="funnel-chart">{stages.map(([label,value])=><div className="funnel-row" key={String(label)}><span>{label}</span><div className="funnel-track"><div style={{width:`${funnel.total?Number(value)/funnel.total*100:0}%`}}/></div><b>{Number(value).toLocaleString()}</b></div>)}</div></Tile>
      <Tile className="analytics-card"><h3>品牌 Top 10</h3><RankList rows={brands}/></Tile>
      <Tile className="analytics-card"><h3>类目 Top 10</h3><RankList rows={categories}/></Tile>
      <Tile className="analytics-card"><h3>类目占比 · 扇形图</h3><div className="pie-layout"><svg className="pie-svg" viewBox="0 0 120 120" role="img" aria-label="类目占比扇形图"><circle cx="60" cy="60" r="42" fill="none" stroke="var(--cds-layer-02)" strokeWidth="18"/>{pieSlices.map((slice:any)=><circle key={slice.label} cx="60" cy="60" r="42" fill="none" stroke={['#0f62fe','#24a148','#ff832b','#da1e28','#8a3ffc','#009d9a'][slice.index]} strokeWidth="18" strokeDasharray={slice.length+' '+(circumference-slice.length)} strokeDashoffset={-slice.offset} transform="rotate(-90 60 60)"/>)}</svg><div className="pie-legend">{pieRows.map((row:any,index:number)=><div key={row.label}><span className={'pie-dot pie-dot-'+index}/><span title={row.label}>{row.label}</span><b>{Math.round(row.count/pieTotal*100)}%</b></div>)}</div></div></Tile>
      <Tile className="analytics-card word-cloud-card"><h3>关键词词云</h3><div className="word-cloud">{words.slice(0,32).map((w:any)=><span key={w.label} style={{fontSize:`${Math.max(12,Math.min(30,12+(w.count/(words[0]?.count||1))*18))}px`}}>{w.label}</span>)}</div></Tile>
      <Tile className="analytics-card"><h3>不同货币价格分布</h3><div className="rank-list">{(data.distributions?.price_by_currency??[]).map((row:any)=><div className="rank-row" key={row.currency}><span>{row.currency}</span><div className="bar-track"><div className="bar-fill" style={{width:`${row.count/Math.max(1,...(data.distributions?.price_by_currency??[]).map((x:any)=>x.count))*100}%`}}/></div><b>{row.count.toLocaleString()}</b><small>均价 {row.average===null?'—':Number(row.average).toLocaleString(undefined,{maximumFractionDigits:2})} · {row.min}–{row.max}</small></div>)}</div><p>不同货币分别统计，避免直接混合币种计算市场均价；未标注货币的数据单独列为 UNKNOWN。</p></Tile>
      <Tile className="analytics-card"><h3>字段完整度</h3><div className="quality-list">{[['标题',data.quality?.title_rate],['价格',data.quality?.price_rate],['货币',data.quality?.currency_rate],['评分',data.quality?.rating_rate],['评论数',data.quality?.reviews_rate],['品牌',data.quality?.brand_rate],['类目',data.quality?.category_rate],['图片',data.quality?.image_rate],['商品链接',data.quality?.link_rate],['SKU/标识',data.quality?.sku_rate],['描述',data.quality?.description_rate],['销量',data.quality?.sales_rate],['库存',data.quality?.stock_rate]].map(([label,rate]:any)=><div className="quality-row" key={label}><span>{label}</span><b>{Math.round((rate??0)*100)}%</b><div className="bar-track"><div className="bar-fill" style={{width:`${(rate??0)*100}%`}}/></div></div>)}</div></Tile>
    </div>
    <Tile><h3>分析口径与覆盖范围</h3><p>价格、评分、评论数、品牌和类目通过常见字段别名识别；源数据保持原样，不会因字段映射而丢失。价格区间按币种独立计算；当数据集包含多种币种或未标注币种时，不生成混合均价、中位数或分位数。</p><p>本次分析覆盖 {coverage.analyzed.toLocaleString()} 条，数据集已同步 {coverage.available.toLocaleString()} 条。词云由商品标题、品牌和类目文本生成。</p></Tile>
  </section>;
}
function RankList({rows}:{rows:any[]}) {
  const max=Math.max(1,...rows.map((r:any)=>r.count));
  return <div className="rank-list">{rows.length?rows.map((r:any)=><div className="rank-row" key={r.label}><span title={r.label}>{r.label}</span><div className="bar-track"><div className="bar-fill" style={{width:`${r.count/max*100}%`}}/></div><b>{r.count}</b></div>):<p>暂无可识别字段</p>}</div>;
}

function extractAIText(result:any,provider:string):string {
  if (provider==='googlegemini') return String(result?.candidates?.[0]?.content?.parts?.[0]?.text??'');
  if (provider==='anthropic') return String(result?.content?.[0]?.text??'');
  if (provider==='cloudflare') return String(result?.result?.response??'');
  return String(result?.choices?.[0]?.message?.content??'');
}

function message(e: unknown) { return e instanceof Error ? e.message : '发生未知错误，请稍后重试。'; }
export default App;
