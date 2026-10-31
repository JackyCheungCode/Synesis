import { useEffect, useMemo, useState } from 'react';
import {
  Header, HeaderMenuButton, HeaderName, HeaderGlobalBar, HeaderGlobalAction,
  SideNav, SideNavItems, SideNavLink, SideNavMenu, SideNavMenuItem, Content,
  Button, InlineNotification, Tag, TextInput, PasswordInput, Tile,
  Toggle, Select, SelectItem, TextArea, Modal, DataTable, Table, TableHead,
  TableRow, TableHeader, TableBody, TableCell, Search, Loading,
} from '@carbon/react';
import {
  Dashboard, Globe, Ai, Folder, ChartLine, Add, Renew, Play,
} from '@carbon/icons-react';
import { BrandIcon } from './components/BrandIcon';
import { platforms, providers, apiIntegrations } from './data/catalog';
import { useAuth } from './auth/AuthProvider';
import { supabase } from './lib/supabase';

type Page = 'dashboard' | 'vault' | 'projects' | 'tasks' | 'reports';
type Credential = { slug: string; name: string; kind: 'provider' | 'integration'; status: string; key_last4?: string; last_validated_at?: string };
type Project = { id: string; name: string; objective: string; status: string; target_regions: string[]; platform_slugs: string[] };
type Plan = { id: string; project_id: string; status: string; plan: Record<string, unknown>; estimated_cost: number | null; created_at: string };
type Task = { id: string; project_id: string; platform_slug: string; status: string; actor_id: string | null; created_at: string; progress?: number; result_count?: number; run_status?: string | null; external_run_id?: string | null; error_message?: string | null; finished_at?: string | null };

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
        supabase.from('collection_tasks').select('id,project_id,platform_slug,status,actor_id,created_at,progress,result_count,run_status,external_run_id,error_message,finished_at').order('created_at',{ascending:false}),
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
      const result = await api('tasks.sync',{taskId:task.id});
      const state = result.task?.run_status ?? result.task?.status ?? '未知';
      const count = result.task?.result_count;
      setNotice({kind:'success',text:`任务状态已同步：${state}${typeof count === 'number' ? `，已接收 ${count} 条结果` : ''}${result.result_truncated ? '（当前已保存前 250 条，可继续扩展分页读取）' : ''}`});
      await loadAll();
    } catch(e) { setNotice({kind:'error',text:message(e)}); }
    finally { setBusy(false); }
  }
  async function viewTaskResults(task: Task) {
    setBusy(true);
    try {
      const result = await api('tasks.results',{taskId:task.id,limit:100,offset:0});
      setTaskResults(result.results ?? []);
      setResultTask(task);
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
      <Content className="synesis-content">
        <div className="workspace-bar">
          <Search size="lg" labelText="全局搜索" placeholder="搜索平台、商品、项目与情报" value={search} onChange={e=>setSearch(e.target.value)}/>
          <div className="workspace-user"><span>{session?.user.email}</span><Button kind="ghost" size="sm" onClick={()=>void signOut()}>登出</Button></div>
        </div>
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
            <DataTable rows={pageRows.map(t=>({...t,id:t.id.slice(0,8),progress_label:`${t.progress ?? 0}%`,result_label:String(t.result_count ?? 0)}))} headers={[{key:'platform_slug',header:'平台'},{key:'status',header:'状态'},{key:'progress_label',header:'进度'},{key:'result_label',header:'结果数'},{key:'actor_id',header:'Apify Actor'},{key:'created_at',header:'创建时间'},{key:'actions',header:'操作'}]}>
              {({rows,headers,getHeaderProps,getRowProps,getTableProps})=><Table {...getTableProps()}><TableHead><TableRow>{headers.map(h=><TableHeader {...getHeaderProps({header:h})} key={h.key}>{h.header}</TableHeader>)}</TableRow></TableHead><TableBody>{rows.map(row=><TableRow {...getRowProps({row})} key={row.id}>{row.cells.map(cell=><TableCell key={cell.id}>{cell.info.header==='actions'?<div className="card-actions">{row.cells.find(c=>c.info.header==='status')?.value==='queued'&&<Button size="sm" kind="tertiary" renderIcon={Play} onClick={()=>{const t=tasks.find(x=>x.id.startsWith(row.id));if(t)void runTask(t)}}>执行</Button>}{['running','queued'].includes(String(row.cells.find(c=>c.info.header==='status')?.value))&&<Button size="sm" kind="ghost" renderIcon={Renew} onClick={()=>{const t=tasks.find(x=>x.id.startsWith(row.id));if(t)void syncTask(t)}}>同步状态</Button>}{row.cells.find(c=>c.info.header==='status')?.value==='succeeded'&&<Button size="sm" kind="ghost" onClick={()=>{const t=tasks.find(x=>x.id.startsWith(row.id));if(t)void viewTaskResults(t)}}>查看结果</Button>}</div>:String(cell.value??'—')}</TableCell>)}</TableRow>)}</TableBody></Table>}
            </DataTable>
          </section>}
          {page==='reports' && <section className="module-stack"><Tile><h2>市场研究报告</h2><p>研究项目、采集证据与 AI 分析完成后，在此生成可追溯的市场报告。</p><Tag type="cool-gray">报告模块骨架</Tag></Tile></section>}
        </div>
      </Content>
      {resultTask && <Modal open modalHeading={`采集结果 · ${resultTask.platform_slug}`} passiveModal primaryButtonText="关闭" onRequestClose={()=>setResultTask(null)}>
        <p>任务 ID：{resultTask.id} · 当前显示前 100 条结果。共接收 {resultTask.result_count ?? taskResults.length} 条。</p>
        <pre className="result-json">{JSON.stringify(taskResults,null,2)}</pre>
      </Modal>}
      {approvalPlan && <Modal open modalHeading="审批 AI 研究计划" primaryButtonText="批准并创建采集任务" secondaryButtonText="返回审阅" onRequestClose={()=>setApprovalPlan(null)} onRequestSubmit={()=>void approvePlan(approvalPlan)} primaryButtonDisabled={busy}>
        <p>请审阅研究范围与采集任务。AI 不会猜测 Apify Actor ID；请在下方 JSON 的 platform_tasks[].actor_id 填入你确认的 Actor ID。批准后只创建待执行任务，不会自动启动 Apify。</p><TextArea id="approval-plan-json" labelText="研究计划（可编辑 JSON）" rows={14} value={approvalPlanText} onChange={e=>setApprovalPlanText(e.target.value)} />
      </Modal>}
    </div>
  );
}

function message(e: unknown) { return e instanceof Error ? e.message : '发生未知错误，请稍后重试。'; }
export default App;
