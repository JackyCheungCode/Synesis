import { useEffect, useMemo, useState } from 'react';
import {
  Header, HeaderMenuButton, HeaderName, HeaderGlobalBar, HeaderGlobalAction, SideNav, SideNavItems, SideNavLink, Content,
  Button, InlineNotification, Tag, TextInput, PasswordInput, Tile,
  Toggle, Select, SelectItem, TextArea, Modal, Loading,
} from '@carbon/react';
import {
  Dashboard, Globe, Ai, Folder, ChartLine, Add, Renew, Play, Search as SearchIcon, UserAvatar,
} from '@carbon/icons-react';
import { BrandIcon } from './components/BrandIcon';
import { platforms, providers, apiIntegrations } from './data/catalog';
import { useAuth } from './auth/AuthProvider';
import { supabase } from './lib/supabase';

type Page = 'dashboard' | 'vault' | 'projects' | 'tasks' | 'reports';
type Credential = { slug: string; name: string; kind: 'provider' | 'integration'; status: string; key_last4?: string; last_validated_at?: string };
type Project = { id: string; name: string; objective: string; status: string; target_regions: string[]; platform_slugs: string[] };
type Plan = { id: string; project_id: string; status: string; plan: Record<string, unknown>; estimated_cost: number | null; created_at: string };
type Task = { id: string; project_id: string; platform_slug: string; status: string; actor_id: string | null; created_at: string; progress?: number; result_count?: number; run_status?: string | null; external_run_id?: string | null; error_message?: string | null; finished_at?: string | null; result_synced_count?: number };

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vuyyaqsmlzixhdjvaidj.supabase.co';
const fnUrl = `${supabaseUrl}/functions/v1/synesis-api`;
const providerModels: Record<string, string> = {
  openai: 'gpt-4.1-mini', googlegemini: 'gemini-2.5-flash', deepseek: 'deepseek-chat',
  anthropic: 'claude-3-7-sonnet-latest', cloudflare: '@cf/meta/llama-3.3-70b-instruct',
  mistral: 'mistral-small-latest', x: 'grok-3-mini',
};

function App() {
  const { session, signOut } = useAuth();
  const [page, setPage] = useState<Page>('dashboard');
  const navigate = (next: Page) => { setPage(next); if (window.matchMedia('(max-width: 1055px)').matches) setNavExpanded(false); };
  const [navExpanded, setNavExpanded] = useState(() => window.matchMedia('(min-width: 66rem)').matches);
  const [notice, setNotice] = useState<{kind:'info'|'success'|'error'|'warning'; text:string}|null>(null);
  const [busy, setBusy] = useState(false);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [resultTask, setResultTask] = useState<Task|null>(null);
  const [taskResults, setTaskResults] = useState<unknown[]>([]);
  const [resultPage, setResultPage] = useState(0);
  const [resultTotal, setResultTotal] = useState(0);
  const [resultSynced, setResultSynced] = useState(0);
  const [analyticsTaskId, setAnalyticsTaskId] = useState('');
  const [analytics, setAnalytics] = useState<any>(null);
  const [keyValues, setKeyValues] = useState<Record<string,string>>({});
  const [projectName, setProjectName] = useState('');
  const [objective, setObjective] = useState('');
  const [regions, setRegions] = useState('美国, 欧洲');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['amazon','ebay']);
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [approvalPlan, setApprovalPlan] = useState<Plan|null>(null);
  const [approvalPlanText, setApprovalPlanText] = useState('');
  const [cloudflareAccountId, setCloudflareAccountId] = useState('');
  const [integrationMeta, setIntegrationMeta] = useState<Record<string,string>>({});
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

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
      const [p, pl, t, c] = await Promise.all([
        supabase.from('research_projects').select('id,name,objective,status,target_regions,platform_slugs').order('updated_at',{ascending:false}),
        supabase.from('ai_research_plans').select('id,project_id,status,plan,estimated_cost,created_at').order('created_at',{ascending:false}),
        supabase.from('collection_tasks').select('id,project_id,platform_slug,status,actor_id,created_at,progress,result_count,result_synced_count,run_status,external_run_id,error_message,finished_at').order('created_at',{ascending:false}),
        api('credentials.list'),
      ]);
      if (p.error) throw p.error; if (pl.error) throw pl.error; if (t.error) throw t.error;
      setProjects(p.data ?? []); setPlans(pl.data ?? []); setTasks(t.data ?? []); setCredentials(c.credentials ?? []);
    } catch (e) { setNotice({kind:'error',text: message(e)}); }
    finally { setBusy(false); }
  }
  useEffect(() => { void loadAll(); }, []);

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
  async function createProject() {
    if (!projectName.trim() || !objective.trim()) return;
    setBusy(true);
    try {
      const {data,error} = await supabase.from('research_projects').insert({
        name:projectName.trim(), objective:objective.trim(),
        target_regions:regions.split(',').map(x=>x.trim()).filter(Boolean),
        platform_slugs:selectedPlatforms, status:'draft',
      }).select().single();
      if(error) throw error;
      setProjectName(''); setObjective('');
      await api('plans.generate',{projectId:data.id,provider:selectedProvider});
      setNotice({kind:'success',text:'研究项目已创建，AI 研究计划已生成并进入待人工审批状态。'});
      navigate('projects'); await loadAll();
    } catch(e) { setNotice({kind:'error',text:message(e)}); }
    finally { setBusy(false); }
  }
  async function approvePlan(plan: Plan) {
    setBusy(true);
    try {
      const approvedPlan = JSON.parse(approvalPlanText);
      await api('plans.approve',{planId:plan.id, plan:approvedPlan});
      setApprovalPlan(null); setNotice({kind:'success',text:'计划已由你批准。系统已创建待执行采集任务；任务仍需单独启动。'});
      await loadAll(); navigate('tasks');
    } catch(e) { setNotice({kind:'error',text:message(e)}); }
    finally { setBusy(false); }
  }
  async function runTask(task: Task) {
    setBusy(true);
    try {
      await api('tasks.execute',{taskId:task.id});
      setNotice({kind:'success',text:'Apify 采集任务已提交。'}); await loadAll();
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

  async function loadAnalytics(taskId: string) {
    if (!taskId) return;
    setBusy(true);
    try { const data = await api('tasks.analytics',{taskId}); setAnalytics(data); setAnalyticsTaskId(taskId); }
    catch(e) { setNotice({kind:'error',text:message(e)}); }
    finally { setBusy(false); }
  }

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
      setNotice({kind:'success',text:`已导出 ${rows.length.toLocaleString()} 条完整原始记录。`});
    } catch(e) { setNotice({kind:'error',text:message(e)}); }
    finally { setBusy(false); }
  }

  const title: Record<Page,string> = {dashboard:'全球外贸情报总览',vault:'Key Vault 与连接管理',projects:'研究项目中心',tasks:'采集任务中心',reports:'市场研究报告'};
  const pendingPlans = plans.filter(p => p.status === 'pending_approval');
  const pageRows = tasks.filter(t => !search || t.platform_slug.includes(search.toLowerCase()));

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
      <SideNav aria-label="Synesis 主导航" expanded={navExpanded} isPersistent={true} isFixedNav>
        <SideNavItems>
          <SideNavLink renderIcon={Dashboard} isActive={page==='dashboard'} onClick={()=>navigate('dashboard')}>情报总览</SideNavLink>
          <SideNavLink renderIcon={Globe} onClick={()=>navigate('dashboard')}>全球外贸情报</SideNavLink>
          <SideNavLink renderIcon={Ai} isActive={page==='vault'} onClick={()=>navigate('vault')}>AI 模型与 Key Vault</SideNavLink>
          <SideNavLink renderIcon={Folder} isActive={page==='projects'} onClick={()=>navigate('projects')}>研究项目中心</SideNavLink>
          <SideNavLink renderIcon={Play} isActive={page==='tasks'} onClick={()=>navigate('tasks')}>采集任务中心</SideNavLink>
          <SideNavLink renderIcon={ChartLine} isActive={page==='reports'} onClick={()=>navigate('reports')}>市场监控与报告</SideNavLink>
        </SideNavItems>
      </SideNav>
      {navExpanded && <button className="nav-dismiss-overlay" aria-label="关闭导航菜单" onClick={()=>setNavExpanded(false)} />}
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
          {page==='projects' && <section className="module-stack">
            <Tile><h2>创建研究项目</h2><div className="project-form">
              <TextInput id="project-name" labelText="项目名称" placeholder="例如：美国站家居收纳市场机会研究" value={projectName} onChange={e=>setProjectName(e.target.value)}/>
              <TextArea id="project-objective" labelText="研究目标与问题" placeholder="描述目标市场、产品品类、竞争格局、目标客户与需要回答的问题…" value={objective} onChange={e=>setObjective(e.target.value)} rows={4}/>
              <TextInput id="project-regions" labelText="目标市场（逗号分隔）" value={regions} onChange={e=>setRegions(e.target.value)}/>
              <fieldset className="platform-picker"><legend>研究平台</legend>{platforms.map(p=><Toggle key={p.slug} id={`platform-${p.slug}`} labelText={p.name} toggled={selectedPlatforms.includes(p.slug)} onToggle={on=>setSelectedPlatforms(v=>on?[...v,p.slug]:v.filter(x=>x!==p.slug))}/>)}</fieldset>
              <Select id="plan-provider" labelText="生成研究计划的 AI Provider" value={selectedProvider} onChange={e=>setSelectedProvider(e.target.value)}>{providers.map(p=><SelectItem key={p.slug} value={p.slug} text={p.name}/>)}</Select>
              <Button kind="primary" renderIcon={Ai} onClick={()=>void createProject()} disabled={!projectName.trim()||!objective.trim()||busy}>创建项目并生成 AI 计划</Button>
            </div></Tile>
            <h2>项目列表</h2>
            {projects.map(p=><Tile key={p.id} className="list-tile"><div><h3>{p.name}</h3><p>{p.objective}</p><div className="tag-row">{p.target_regions.map(r=><Tag key={r}>{r}</Tag>)}<Tag type="blue">{p.status}</Tag></div></div><Button kind="ghost" onClick={()=>navigate('tasks')}>查看任务</Button></Tile>)}
            <h2>等待人工审批的 AI 研究计划</h2>
            {pendingPlans.map(p=><Tile key={p.id} className="list-tile"><div><h3>研究计划 · {projects.find(x=>x.id===p.project_id)?.name ?? p.project_id}</h3><p>{JSON.stringify(p.plan).slice(0,500)}</p><Tag type="warm-gray">待人工审批</Tag></div><Button kind="primary" onClick={()=>{setApprovalPlan(p);setApprovalPlanText(JSON.stringify(p.plan,null,2));}}>审阅并审批</Button></Tile>)}
          </section>}
          {page==='tasks' && <section className="module-stack"><div className="module-heading"><div><h2>Apify 采集任务</h2><p>只有通过人工审批的研究计划才会产生可执行任务。</p></div><Button kind="tertiary" renderIcon={Renew} onClick={()=>void loadAll()}>刷新</Button></div>
            <div className="task-table-wrap"><table className="task-table"><thead><tr><th>平台</th><th>状态</th><th>进度</th><th>结果接收</th><th>Apify Actor</th><th>创建时间</th><th>操作</th></tr></thead><tbody>
              {pageRows.map(task=><tr key={task.id}><td>{task.platform_slug}</td><td><Tag type={task.status==='succeeded'?'green':task.status==='failed'?'red':'blue'}>{task.status}</Tag></td><td>{task.progress??0}%</td><td>{(task.result_synced_count??0).toLocaleString()} / {(task.result_count??0).toLocaleString()}</td><td>{task.actor_id??'—'}</td><td>{new Date(task.created_at).toLocaleString()}</td><td><div className="card-actions">
                {task.status==='queued'&&<Button size="sm" kind="tertiary" renderIcon={Play} onClick={()=>void runTask(task)}>执行</Button>}
                {(['running','queued'].includes(task.status)||(task.status==='succeeded'&&(task.result_synced_count??0)<(task.result_count??0)))&&<Button size="sm" kind="ghost" renderIcon={Renew} onClick={()=>void syncTask(task)}>同步 / 继续接收</Button>}
                {task.status==='succeeded'&&<Button size="sm" kind="ghost" onClick={()=>void viewTaskResults(task)}>查看结果</Button>}
              </div></td></tr>)}
            </tbody></table></div>
          </section>}
          {page==='reports' && <section className="module-stack">
            <Tile><div className="module-heading"><div><h2>产品数据分析工作台</h2><p>从完整采集明细中计算价格、评分、品牌、类目、关键词、商品信息完整度和转化漏斗。</p></div><Tag type="blue">多维分析</Tag></div>
              <Select id="analytics-task" labelText="选择已完成采集的数据集" value={analyticsTaskId} onChange={e=>{setAnalyticsTaskId(e.target.value);setAnalytics(null);}}><SelectItem value="" text="请选择采集任务"/>{tasks.filter(t=>t.status==='succeeded').map(t=><SelectItem key={t.id} value={t.id} text={`${t.platform_slug} · ${t.id.slice(0,8)} · ${t.result_synced_count??0} 条`}/>)}</Select>
              <Button kind="primary" renderIcon={ChartLine} disabled={!analyticsTaskId||busy} onClick={()=>void loadAnalytics(analyticsTaskId)}>生成多维分析</Button>
            </Tile>
            {analytics && <AnalyticsDashboard data={analytics}/>}
            <Tile><h2>市场研究报告</h2><p>后续报告将引用这里的统计口径、原始采集记录和数据质量指标，保证结论可追溯。</p><Tag type="cool-gray">报告生成持续完善中</Tag></Tile>
          </section>}
        </div>
      </Content>
      {searchOpen && <Modal open modalHeading="全局搜索" primaryButtonText="完成" secondaryButtonText="清除" onRequestClose={()=>setSearchOpen(false)} onRequestSubmit={()=>setSearchOpen(false)} onSecondarySubmit={()=>setSearch('')}>
        <TextInput id="global-search" labelText="搜索平台、商品、项目与情报" placeholder="输入关键词" value={search} onChange={e=>setSearch(e.target.value)}/>
      </Modal>}
      {resultTask && <Modal open modalHeading={`采集结果 · ${resultTask.platform_slug}`} passiveModal primaryButtonText="关闭" onRequestClose={()=>setResultTask(null)}>
        <p>任务 ID：{resultTask.id} · 当前页显示 {taskResults.length} 条；总计 {resultTotal.toLocaleString()} 条，已同步 {resultSynced.toLocaleString()} 条。</p>
        <div className="card-actions"><Button kind="secondary" size="sm" disabled={resultPage===0} onClick={()=>void viewTaskResults(resultTask,resultPage-1)}>上一页</Button><Tag type="blue">第 {resultPage+1} / {Math.max(1,Math.ceil(resultTotal/100))} 页</Tag><Button kind="secondary" size="sm" disabled={(resultPage+1)*100>=resultSynced} onClick={()=>void viewTaskResults(resultTask,resultPage+1)}>下一页</Button><Button kind="tertiary" size="sm" onClick={()=>void exportTaskResults(resultTask)}>导出全部 CSV</Button></div><pre className="result-json">{JSON.stringify(taskResults,null,2)}</pre>
      </Modal>}
      {approvalPlan && <Modal open modalHeading="审批 AI 研究计划" primaryButtonText="批准并创建采集任务" secondaryButtonText="返回审阅" onRequestClose={()=>setApprovalPlan(null)} onRequestSubmit={()=>void approvePlan(approvalPlan)} primaryButtonDisabled={busy}>
        <p>请审阅研究范围与采集任务。AI 不会猜测 Apify Actor ID；请在下方 JSON 的 platform_tasks[].actor_id 填入你确认的 Actor ID。批准后只创建待执行任务，不会自动启动 Apify。</p><TextArea id="approval-plan-json" labelText="研究计划（可编辑 JSON）" rows={14} value={approvalPlanText} onChange={e=>setApprovalPlanText(e.target.value)} />
      </Modal>}
    </div>
  );
}


function AnalyticsDashboard({data}:{data:any}) {
  const metrics=data.metrics??{}, coverage=data.coverage??{}, bands=data.distributions?.price_bands??[];
  const maxBand=Math.max(1,...bands.map((x:any)=>x.count)), words=data.distributions?.words??[];
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
      <Tile><span className="metric-label">平均价格</span><strong className="metric-value">{money(metrics.average_price)}</strong><p>有效价格 {metrics.price_count??0} 条</p></Tile>
      <Tile><span className="metric-label">价格中位数</span><strong className="metric-value">{money(metrics.median_price)}</strong><p>P25 {money(metrics.p25_price)} · P75 {money(metrics.p75_price)}</p></Tile>
      <Tile><span className="metric-label">平均评分</span><strong className="metric-value">{money(metrics.average_rating)}</strong><p>有效评分 {metrics.rating_count??0} 条</p></Tile>
      <Tile><span className="metric-label">平均评论数</span><strong className="metric-value">{money(metrics.average_reviews)}</strong></Tile>
    </div>
    <div className="analytics-grid">
      <Tile className="analytics-card"><h3>价格区间分布</h3><div className="bar-chart">{bands.map((b:any)=><div className="bar-row" key={b.label}><span>{b.label}</span><div className="bar-track"><div className="bar-fill" style={{width:`${b.count/maxBand*100}%`}}/></div><b>{b.count}</b></div>)}</div></Tile>
      <Tile className="analytics-card trend-card"><h3>商品采集时间趋势 · 折线图</h3>{trends.length>1?<><svg viewBox="0 0 600 205" role="img" aria-label="按商品源时间字段统计的每日商品数量趋势"><line x1="24" y1="28" x2="24" y2="176" stroke="var(--cds-border-strong)"/><line x1="24" y1="176" x2="576" y2="176" stroke="var(--cds-border-strong)"/><polyline points={trendCoordinates} fill="none" stroke="#0f62fe" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>{trends.map((point:any,index:number)=><circle key={point.date} cx={24+(trends.length<=1?0:index*552/(trends.length-1))} cy={176-(point.count/maxTrend)*148} r="3.5" fill="#0f62fe"/>)}</svg><div className="trend-axis"><span>{trends[0].date}</span><span>{trends[trends.length-1].date}</span></div><p>按原始记录中的日期、创建时间、发布时间或采集时间字段分组。</p></>:<p>当前数据集没有足够的可识别源时间字段，暂不绘制趋势线；不会用同步时间伪造商品趋势。</p>}</Tile>
      <Tile className="analytics-card"><h3>数据采集漏斗</h3><div className="funnel-chart">{stages.map(([label,value])=><div className="funnel-row" key={String(label)}><span>{label}</span><div className="funnel-track"><div style={{width:`${funnel.total?Number(value)/funnel.total*100:0}%`}}/></div><b>{Number(value).toLocaleString()}</b></div>)}</div></Tile>
      <Tile className="analytics-card"><h3>品牌 Top 10</h3><RankList rows={brands}/></Tile>
      <Tile className="analytics-card"><h3>类目 Top 10</h3><RankList rows={categories}/></Tile>
      <Tile className="analytics-card"><h3>类目占比 · 扇形图</h3><div className="pie-layout"><svg className="pie-svg" viewBox="0 0 120 120" role="img" aria-label="类目占比扇形图"><circle cx="60" cy="60" r="42" fill="none" stroke="var(--cds-layer-02)" strokeWidth="18"/>{pieSlices.map((slice:any)=><circle key={slice.label} cx="60" cy="60" r="42" fill="none" stroke={['#0f62fe','#24a148','#ff832b','#da1e28','#8a3ffc','#009d9a'][slice.index]} strokeWidth="18" strokeDasharray={slice.length+' '+(circumference-slice.length)} strokeDashoffset={-slice.offset} transform="rotate(-90 60 60)"/>)}</svg><div className="pie-legend">{pieRows.map((row:any,index:number)=><div key={row.label}><span className={'pie-dot pie-dot-'+index}/><span title={row.label}>{row.label}</span><b>{Math.round(row.count/pieTotal*100)}%</b></div>)}</div></div></Tile>
      <Tile className="analytics-card word-cloud-card"><h3>关键词词云</h3><div className="word-cloud">{words.slice(0,32).map((w:any)=><span key={w.label} style={{fontSize:`${Math.max(12,Math.min(30,12+(w.count/(words[0]?.count||1))*18))}px`}}>{w.label}</span>)}</div></Tile>
      <Tile className="analytics-card"><h3>字段完整度</h3><div className="quality-list">{[['标题',data.quality?.title_rate],['价格',data.quality?.price_rate],['评分',data.quality?.rating_rate],['图片',data.quality?.image_rate],['商品链接',data.quality?.link_rate]].map(([label,rate]:any)=><div className="quality-row" key={label}><span>{label}</span><b>{Math.round((rate??0)*100)}%</b><div className="bar-track"><div className="bar-fill" style={{width:`${(rate??0)*100}%`}}/></div></div>)}</div></Tile>
    </div>
    <Tile><h3>分析口径与覆盖范围</h3><p>价格、评分、评论数、品牌和类目通过常见字段别名识别；源数据保持原样，不会因字段映射而丢失。不同币种未换算时，价格均值和分布仅代表原始数值，不能直接视为同币种市场价格。</p><p>本次分析覆盖 {coverage.analyzed.toLocaleString()} 条，数据集已同步 {coverage.available.toLocaleString()} 条。词云由商品标题、品牌和类目文本生成。</p></Tile>
  </section>;
}
function RankList({rows}:{rows:any[]}) {
  const max=Math.max(1,...rows.map((r:any)=>r.count));
  return <div className="rank-list">{rows.length?rows.map((r:any)=><div className="rank-row" key={r.label}><span title={r.label}>{r.label}</span><div className="bar-track"><div className="bar-fill" style={{width:`${r.count/max*100}%`}}/></div><b>{r.count}</b></div>):<p>暂无可识别字段</p>}</div>;
}

function message(e: unknown) { return e instanceof Error ? e.message : '发生未知错误，请稍后重试。'; }
export default App;
