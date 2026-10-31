import { useEffect, useMemo, useRef, useState } from 'react';
import { useWorkspaceRoute, type WorkspacePage } from './lib/router';
import { WorkspaceNavigation } from './components/WorkspaceNavigation';
import { ResearchWizard, type ResearchProfile } from './features/research/ResearchWizard';
import { WorkspaceDashboard } from './features/dashboard/WorkspaceDashboard';
import { CredentialVault } from './features/settings/CredentialVault';
import { CollectionSettingsPage, type CollectionSettings } from './features/settings/CollectionSettingsPage';
import { ProductLibrary } from './features/products/ProductLibrary';
import {
  Header, HeaderMenuButton, HeaderName, HeaderGlobalBar, HeaderGlobalAction, Content, Grid, Column,
  Breadcrumb, BreadcrumbItem, Button, InlineNotification, Tag, TextInput, Tile,
  Modal, Loading, Accordion, AccordionItem,
} from './components/ui';
import {
  Search as SearchIcon, UserAvatar,
} from './components/icons';
import { LineChart, DonutChart } from './components/ui';
import { useAuth } from './auth/AuthProvider';
import { supabase } from './lib/supabase';

type Page = WorkspacePage;
type Credential = { slug: string; name: string; kind: 'provider' | 'integration'; status: string; key_last4?: string; last_validated_at?: string; account_id?: string; selected_model?: string | null };
type Project = { id: string; name: string; objective: string; status: string; target_regions: string[]; platform_slugs: string[]; scope?: Record<string,any> };
type Plan = { id: string; project_id: string; status: string; plan: Record<string, unknown>; estimated_cost: number | null; created_at: string };
type Task = { id: string; project_id: string; platform_slug: string; status: string; actor_id: string | null; created_at: string; progress?: number; result_count?: number; run_status?: string | null; external_run_id?: string | null; error_message?: string | null; finished_at?: string | null; result_synced_count?: number };
type MarketReport = { id:string; title:string; status:string; created_at:string; project_id:string|null; report_type?:string; evidence?:Array<{task_id?:string;platform_slug?:string}>; content:Record<string,unknown> };
type Product = {id:string;canonical_key:string;title:string|null;brand:string|null;category:string|null;description:string|null;image_url:string|null;updated_at:string};
type ProductHistory = {id:string;price:number;currency:string;observed_at:string;source_task_id:string;source?:{platform_slug:string;external_product_id:string;source_url:string}|null};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vuyyaqsmlzixhdjvaidj.supabase.co';
const fnUrl = `${supabaseUrl}/functions/v1/synesis-api`;
function App() {
  const { session, signOut } = useAuth();
  const route = useWorkspaceRoute();
  const page = route.page;
  const projectId = route.projectId;
  const navigate = (next: Page, id?: string) => { route.navigate(next, id); setNavExpanded(false); };
  const [navExpanded, setNavExpanded] = useState(false);
  const [theme, setTheme] = useState<'light'|'dark'>(() => window.localStorage.getItem('synesis-theme') === 'dark' ? 'dark' : 'light');
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
  const [projectResultRows, setProjectResultRows] = useState<Array<{task_id:string;platform_slug:string;item_index:number;raw_data:unknown;normalized?:{entity_type:string;canonical_key:string|null;normalized_data:Record<string,unknown>;field_sources:Record<string,string>;quality_score:number;warnings:string[];normalization_version:number}|null}>>([]);
  const [projectResultTotal, setProjectResultTotal] = useState(0);
  const [projectResultOffset, setProjectResultOffset] = useState(0);
  const [analyticsTaskId, setAnalyticsTaskId] = useState('');
  const [taskLogs, setTaskLogs] = useState<Record<string,string[]>>({});
  const [analytics, setAnalytics] = useState<any>(null);
  const [keyValues, setKeyValues] = useState<Record<string,string>>({});
  const [providerModelsList,setProviderModelsList]=useState<Record<string,Array<{id:string;name?:string;task?:string}>>>({});
  const loadedProviderModels=useRef(new Set<string>());
  const providerModelLoads=useRef(new Set<string>());
  const [selectedProviderModels,setSelectedProviderModels]=useState<Record<string,string>>({});
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [collectionSettings, setCollectionSettings] = useState<CollectionSettings>({ itemsPerPlatform:100, depth:'standard' });
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
        supabase.from('research_projects').select('id,name,objective,status,target_regions,platform_slugs,scope').order('updated_at',{ascending:false}),
        supabase.from('ai_research_plans').select('id,project_id,status,plan,estimated_cost,created_at').order('created_at',{ascending:false}),
        supabase.from('collection_tasks').select('id,project_id,platform_slug,status,actor_id,created_at,started_at,updated_at,progress,result_count,result_synced_count,run_status,external_run_id,error_message,finished_at').order('created_at',{ascending:false}),
        api('credentials.list'),
        supabase.from('market_reports').select('id,title,status,created_at,project_id,report_type,evidence,content').order('created_at',{ascending:false}),
      ]);
      if (p.error) throw p.error; if (pl.error) throw pl.error; if (t.error) throw t.error; if (r.error) throw r.error;
      setProjects(p.data ?? []); setPlans(pl.data ?? []); setTasks(t.data ?? []); setCredentials(c.credentials ?? []); const cloudflareCredential=(c.credentials??[]).find((item:Credential)=>item.slug==='cloudflare'&&item.kind==='provider'); if(cloudflareCredential?.account_id) setCloudflareAccountId(cloudflareCredential.account_id); setReports(r.data ?? []); const activeProvider=(c.credentials??[]).find((item:Credential)=>item.kind==='provider'&&item.status==='validated'); if(activeProvider) setSelectedProvider(activeProvider.slug);
    } catch (e) { setNotice({kind:'error',text: message(e)}); }
    finally { setBusy(false); }
  }
  useEffect(() => { void loadAll(); }, []);
  useEffect(() => { if(page==='vault') credentials.filter(item=>item.kind==='provider').forEach(item=>void loadProviderModels(item.slug)); }, [page,credentials]);
  useEffect(() => { window.localStorage.setItem('synesis-theme', theme); }, [theme]);
  useEffect(() => {
    const saved = session?.user.user_metadata?.research_collection_settings;
    if (saved && typeof saved === 'object') {
      const items = Number(saved.itemsPerPlatform);
      const depth = saved.depth;
      setCollectionSettings({ itemsPerPlatform:Number.isFinite(items)?Math.min(5000,Math.max(10,items)):100, depth:depth==='light'||depth==='deep'?depth:'standard' });
    }
  }, [session?.user.id]);
  useEffect(() => { if (page === 'products') void loadProducts(0); }, [page]);

  async function saveCollectionSettings() {
    setBusy(true);
    try {
      const {error} = await supabase.auth.updateUser({ data:{ research_collection_settings:collectionSettings } });
      if(error) throw error;
      setNotice({kind:'success',text:'调研采集设置已保存到当前账户，将用于后续新建的调研任务。'});
    } catch(e) { setNotice({kind:'error',text:'保存采集设置失败：'+message(e)}); }
    finally { setBusy(false); }
  }

  async function saveCredential(slug: string, name: string, kind: 'provider'|'integration') {
    const value = keyValues[slug]?.trim();
    if (!value) return;
    setBusy(true);
    try {
      await api('credentials.save', { slug, name, kind, apiKey:value, accountId: slug === 'cloudflare' ? cloudflareAccountId.trim() : undefined, metadata: kind === 'integration' ? (slug === 'reddit' ? { clientId: integrationMeta.reddit ?? '' } : slug === 'tiktok' ? { clientKey: integrationMeta.tiktok ?? '' } : {}) : {} });
      setKeyValues(v => ({...v,[slug]:''}));
      setNotice({kind:'success',text:`${name} 凭证已加密保存，正在自动获取可用模型…`});
      await loadAll();
      if(kind==='provider') await loadProviderModels(slug,true);
    } catch(e) { setNotice({kind:'error',text:message(e)}); }
    finally { setBusy(false); }
  }
  async function loadProviderModels(slug:string,force=false) {
    if(providerModelLoads.current.has(slug)||(!force&&loadedProviderModels.current.has(slug))) return;
    providerModelLoads.current.add(slug);
    setBusy(true);
    try {
      const result=await api('models.list',{slug});
      const available=(result.models??[]) as Array<{id:string;name?:string;task?:string}>;
      setProviderModelsList(v=>({...v,[slug]:available}));
      loadedProviderModels.current.add(slug);
      const current=String(result.selected_model??'');
      const next=available.some(item=>item.id===current)?current:(available[0]?.id??'');
      if(next) {
        setSelectedProviderModels(v=>({...v,[slug]:next}));
        if(next!==current) await api('models.select',{slug,model:next});
        setNotice({kind:'success',text:`已自动获取 ${available.length} 个模型，并默认选择：${available.find(item=>item.id===next)?.name??next}。可在该 Provider 卡片的“默认模型”下拉框中更换。`});
      } else {
        setSelectedProviderModels(v=>({...v,[slug]:''}));
        setNotice({kind:'warning',text:available.length?'模型列表已获取，请在“默认模型”下拉框中选择。':'已连接模型目录，但没有返回可用模型。请检查该 Provider 的模型权限、账户可用模型或模型目录响应。'});
      }
    } catch(e) { setNotice({kind:'error',text:`自动获取模型失败：${message(e)}。可修正凭证后重新保存，或点击“刷新模型列表”。`}); }
    finally { providerModelLoads.current.delete(slug); setBusy(false); }
  }
  async function saveProviderModel(slug:string,model:string) {
    if(!model) return;
    setSelectedProviderModels(v=>({...v,[slug]:model}));
    try { await api('models.select',{slug,model}); setNotice({kind:'success',text:'默认模型已保存。'}); }
    catch(e) { setNotice({kind:'error',text:message(e)}); }
  }
  async function testConnection(slug: string, kind: 'provider'|'integration') {
    setBusy(true);
    try {
      const result = await api('connection.test',{slug,kind,model:selectedProviderModels[slug]});
      setNotice({kind:'success',text:`${slug} 连接成功：${result.message ?? '凭证有效，服务可调用'}`});
      await loadAll();
    } catch(e) { setNotice({kind:'error',text:message(e)}); }
    finally { setBusy(false); }
  }
  async function parseResearchBrief(brief: string): Promise<ResearchProfile> {
    if (!credentials.some(item=>item.kind==='provider'&&item.status==='validated')) throw new Error('请先在 AI 模型与 Key Vault 配置并验证一个 AI Provider。');
    setBusy(true);
    try {
      const result = await api('research.parse',{brief:brief.trim(),provider:selectedProvider});
      if (!result.profile || !Array.isArray(result.profile.dimensions)) throw new Error('AI 返回的研究条件格式无效，请重新解析。');
      return result.profile as ResearchProfile;
    } finally { setBusy(false); }
  }
  async function createProject(brief: string, profile: ResearchProfile, projectId?:string) {
    const researchBrief = brief.trim();
    if (!researchBrief || !profile?.dimensions?.length) return;
    setBusy(true);
    try {
      const countries = profile.dimensions.find(item=>item.key==='countries')?.values ?? [];
      const regions = profile.dimensions.find(item=>item.key==='regions')?.values ?? [];
      const targetRegions = [...countries,...regions].filter(Boolean);
      if (!session?.user.id) throw new Error('登录状态已失效，请重新登录后再保存研究需求。');
      const payload = {
        user_id:session.user.id,
        name:(profile.summary || researchBrief).slice(0,56),
        objective:researchBrief, target_regions:targetRegions, platform_slugs:[],
        scope:{...(projectId?projects.find(item=>item.id===projectId)?.scope??{}:{}),input_mode:'structured_research',research_profile:profile,original_brief:researchBrief,profile_version:1,workflow_state:'in_progress',active_step:1},
        status:'planning',
      };
      const result = projectId
        ? await supabase.from('research_projects').update(payload).eq('id',projectId).select().single()
        : await supabase.from('research_projects').insert(payload).select().single();
      if(result.error) throw result.error;
      navigate('projects', result.data.id);
      setNotice({kind:'success',text:'第一步已保存：研究需求已确认。现在可以进入第二步选择调研平台。'});
      await loadAll();
    } catch(e) { setNotice({kind:'error',text:message(e)}); }
    finally { setBusy(false); }
  }

  async function updateResearchWorkflowStep(targetProjectId:string,step:number) {
    const project=projects.find(item=>item.id===targetProjectId);
    if(!project||!session?.user.id)return;
    const nextScope={...(project.scope??{}),active_step:Math.max(0,Math.min(4,step))};
    const {error}=await supabase.from('research_projects').update({scope:nextScope}).eq('id',targetProjectId).eq('user_id',session.user.id);
    if(error){setNotice({kind:'error',text:'保存研究步骤失败：'+message(error)});return;}
    setProjects(current=>current.map(item=>item.id===targetProjectId?{...item,scope:nextScope}:item));
  }

  async function saveResearchDraft(draft:{brief:string;formValues:Record<string,string>;profile:ResearchProfile|null;activeStep:number;selectedSources:string[]},projectId?:string) {
    setBusy(true);
    try {
      const existing=projectId?projects.find(item=>item.id===projectId):undefined;
      const originalBrief=draft.brief.trim();
      const objective=originalBrief || existing?.objective || '待完善的研究需求';
      const scope={
        ...(existing?.scope??{}),
        input_mode:'structured_research',
        workflow_state:existing?.scope?.workflow_state==='draft'||!existing?'draft':'in_progress',
        active_step:draft.activeStep,
        intake_form:Object.keys(draft.formValues).length?draft.formValues:(existing?.scope?.intake_form??{}),
        original_brief:originalBrief,
        research_profile:draft.profile,
        selected_data_sources:draft.selectedSources,
        profile_version:1,
      };
      const regions=[...(draft.profile?.dimensions.find(item=>item.key==='countries')?.values??[]),...(draft.profile?.dimensions.find(item=>item.key==='regions')?.values??[])];
      if (!session?.user.id) throw new Error('登录状态已失效，请重新登录后再保存研究草稿。');
      const payload={user_id:session.user.id,name:(draft.profile?.summary||objective).slice(0,56),objective,target_regions:regions,scope,status:'planning'};
      const result=projectId
        ? await supabase.from('research_projects').update(payload).eq('id',projectId).select().single()
        : await supabase.from('research_projects').insert(payload).select().single();
      if(result.error) throw result.error;
      if(!projectId) navigate('projects',result.data.id);
      setNotice({kind:'success',text:'研究草稿已暂存。你可以稍后从研究项目列表继续。'});
      await loadAll();
    } catch(e) { setNotice({kind:'error',text:'暂存失败：'+message(e)}); }
    finally { setBusy(false); }
  }
  async function generateResearchPlan(project: Project, selectedSources: string[]) {
    setBusy(true);
    try {
      const sourceLabels = selectedSources.map(id => {
        const labels: Record<string,string> = {
          ecommerce:'全球电商平台',social:'社交媒体',search:'搜索引擎与购物搜索',
          reviews:'商品评价与消费者反馈',suppliers:'企业与供应商',ads:'广告与市场趋势',
          brands:'独立站与品牌官网',other:'其他行业数据',
        };
        return labels[id] ?? id;
      });
      const selectedScope = { ...(project.scope ?? {}), selected_data_sources:selectedSources, selected_data_source_labels:sourceLabels, collection_settings:collectionSettings };
      const baseObjective = String(project.scope?.original_brief ?? project.objective);
      const enrichedObjective = baseObjective + '\\n\\n用户选择的数据来源平台：' + sourceLabels.join('、') +
        '。采集默认设置：每个平台目标返回 '+collectionSettings.itemsPerPlatform+' 条；采集深度为 '+({light:'快速采集（列表与核心字段）',standard:'标准采集（核心字段与关键互动/评分/基础详情）',deep:'深度采集（在 Actor 支持时扩展详情、评论及关联信息）'}[collectionSettings.depth])+'。请优先寻找这些平台对应的真实可用 Apify Actor，并依据各 Actor 的 Input Schema 将数量和深度映射到有效参数；无法支持的字段要明确说明，不得虚构。';
      const {error} = await supabase.from('research_projects').update({
        objective:enrichedObjective, platform_slugs:selectedSources, scope:selectedScope,
      }).eq('id',project.id).eq('user_id',session?.user.id);
      if(error) throw error;
      await api('plans.generate',{projectId:project.id,provider:selectedProvider});
      setNotice({kind:'success',text:'已完成 Apify Store 候选搜索和采集方案生成。请检查 Actor、用途和 Schema 校验结果，再决定是否批准。'});
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
  async function loadProjectResults(projectId:string,offset=0) {
    try {
      const result=await api('tasks.project-results',{projectId,limit:100,offset});
      setProjectResultRows(result.results??[]);
      setProjectResultTotal(Number(result.total??0));
      setProjectResultOffset(offset);
    } catch(e) { setNotice({kind:'error',text:'跨平台数据加载失败：'+message(e)}); }
  }

  async function exportProjectResults(targetProjectId:string) {
    setBusy(true);
    try {
      const first=await api('tasks.project-results',{projectId:targetProjectId,limit:250,offset:0});
      const total=Number(first.total??0);
      const rows:Record<string,unknown>[]=[];
      const append=(items:any[])=>items.forEach(item=>{
        rows.push({
          platform_slug:item.platform_slug,task_id:item.task_id,item_index:item.item_index,
          entity_type:item.normalized?.entity_type??'',canonical_key:item.normalized?.canonical_key??'',
          quality_score:item.normalized?.quality_score??'',normalization_warnings:item.normalized?.warnings??[],
          ...(item.normalized?.normalized_data??{}),raw_data_json:item.raw_data,
        });
      });
      append(first.results??[]);
      for(let offset=250;offset<total;offset+=250) {
        const page=await api('tasks.project-results',{projectId:targetProjectId,limit:250,offset});
        append(page.results??[]);
      }
      const keys=Array.from(new Set(rows.flatMap(row=>Object.keys(row))));
      const csvCell=(value:unknown)=>{
        const raw=value!==null&&typeof value==='object'?JSON.stringify(value):String(value??'');
        const firstChar=raw.charCodeAt(0);
        const safe='=+-@'.includes(raw[0]??'')||firstChar===9||firstChar===13?"'"+raw:raw;
        return '"'+safe.replace(/"/g,'""')+'"';
      };
      const csv=[keys.map(csvCell).join(','),...rows.map(row=>keys.map(key=>csvCell(row[key])).join(','))].join('\r\n');
      const blob=new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8;'});
      const url=URL.createObjectURL(blob);const link=document.createElement('a');
      link.href=url;link.download='synesis-project-'+targetProjectId+'-unified-dataset.csv';link.click();URL.revokeObjectURL(url);
      setNotice({kind:'success',text:'已导出 '+rows.length.toLocaleString()+' 条跨平台标准化数据及原始 JSON。'});
    } catch(e) { setNotice({kind:'error',text:'统一数据集导出失败：'+message(e)}); }
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

  async function saveProjectAnalytics(projectId:string) {
    const project=projects.find(item=>item.id===projectId);
    const projectTasks=tasks.filter(item=>item.project_id===projectId);
    if(!project||!session?.user.id||!projectTasks.length) return;
    if(projectTasks.some(task=>task.status!=='succeeded'||Number(task.result_synced_count??0)<Number(task.result_count??0))) {
      setNotice({kind:'warning',text:'仍有采集任务未完成或数据尚未全部同步，暂不能进行项目统计。'});
      return;
    }
    setBusy(true);
    try {
      const savedTaskIds=new Set(reports.filter(report=>report.project_id===projectId&&report.report_type==='dataset_analytics')
        .flatMap(report=>(report.evidence??[]).map(item=>item.task_id).filter((id):id is string=>Boolean(id))));
      const pendingTasks=projectTasks.filter(task=>!savedTaskIds.has(task.id));
      if(!pendingTasks.length) {
        setNotice({kind:'success',text:'所有数据源均已有统计快照。'});
        return;
      }
      const analyses=await Promise.all(pendingTasks.map(async task=>({
        task,
        analysis:await api('tasks.analytics',{taskId:task.id}),
      })));
      const now=new Date().toISOString();
      const rows=analyses.map(({task,analysis})=>({
        user_id:session.user.id,project_id:projectId,
        title:`${task.platform_slug} 数据统计快照 · ${now.slice(0,10)}`,
        report_type:'dataset_analytics',content:analysis,
        evidence:[{task_id:task.id,platform_slug:task.platform_slug,result_count:task.result_count,result_synced_count:task.result_synced_count}],
        status:'generated',generated_at:now,
      }));
      const {error}=await supabase.from('market_reports').insert(rows);
      if(error) throw error;
      setAnalytics(analyses[analyses.length-1]?.analysis??null);
      setAnalyticsTaskId(analyses[analyses.length-1]?.task.id??'');
      await loadAll();
      setNotice({kind:'success',text:`项目统计完成：新增 ${rows.length} 个数据源统计快照。可进入第五步生成 AI 报告。`});
    } catch(e) {
      setNotice({kind:'error',text:'项目统计失败：'+message(e)});
    } finally {
      setBusy(false);
    }
  }

  async function loadTaskLogs(task: Task) {
    if (!task.external_run_id) return;
    try {
      const data=await api('tasks.logs',{taskId:task.id});
      setTaskLogs(current=>({...current,[task.id]:String(data.logs??'').split(/\r?\n/).filter(Boolean).slice(-250)}));
    } catch(e) {
      setTaskLogs(current=>({...current,[task.id]:['日志暂时不可用：'+message(e)]}));
    }
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

    async function generateResearchReport(projectId: string) {
    if (!session?.user.id) return;
    const project = projects.find(item=>item.id===projectId);
    const projectTasks = tasks.filter(item=>item.project_id===projectId);
    if (!project || !projectTasks.length || projectTasks.some(item=>item.status!=='succeeded' || Number(item.result_synced_count??0)<Number(item.result_count??0))) return;
    const savedAnalytics=reports.filter(report=>report.project_id===projectId&&report.report_type==='dataset_analytics');
    const savedByTask=new Map(savedAnalytics.flatMap(report=>(report.evidence??[]).filter(item=>item.task_id).map(item=>[item.task_id as string,report.content] as const)));
    if(projectTasks.some(task=>!savedByTask.has(task.id))) throw new Error('第四步的项目统计快照尚未全部保存。');
    const analyses = projectTasks.map(task=>({platform:task.platform_slug,taskId:task.id,analysis:savedByTask.get(task.id)}));
    const normalizationSummary=await api('tasks.project-normalization-summary',{projectId});
    const response = await api('ai.invoke',{provider:selectedProvider,model:selectedProviderModels[selectedProvider],messages:[
      {role:'system',content:'你是 Synesis 的跨境商业智能研究负责人。请用中文输出一份可供管理层决策的完整研究报告。严格依据研究目标、研究画像、目标地区、实际采集任务、各数据源统计快照及全项目标准化质量汇总。字段完整度评分不代表事实准确率或模型置信度；报告需披露标准化覆盖率、平均完整度和质量提醒数量。报告必须包含：执行摘要、研究范围与方法、市场概览、跨平台对比、产品开发策略、定价策略、目标市场进入策略、消费者画像与需求、竞争策略、营销与销售渠道、商业机会、风险、30/60/90天行动路线图、数据质量评估、数据局限和待验证假设。对每项关键结论标记“数据事实 / AI 推断 / 商业建议 / 待验证假设”，引用对应平台名称、统计覆盖数和实际字段/指标；不能把不同币种价格直接比较，不能把播放量、销量、搜索排名混为同一指标。不得虚构市场规模、销量、利润、人口属性、竞争份额或未提供的指标。没有证据时明确写“数据不足，暂不判断”。输出严格 JSON，不要 Markdown 代码围栏，字段使用 executive_summary、research_scope、market_overview、cross_platform_comparison、product_development_strategy、pricing_strategy、market_entry_strategy、customer_persona_strategy、competitive_strategy、marketing_channel_strategy、opportunities、risks、action_roadmap、data_quality_assessment、limitations、assumptions_to_validate。数组项应包含结论、依据、类型和来源。'},
      {role:'user',content:JSON.stringify({research_objective:project.objective,research_profile:project.scope?.research_profile??null,intake_form:project.scope?.intake_form??{},target_regions:project.target_regions,selected_platforms:project.platform_slugs,collection_settings:project.scope?.collection_settings??null,normalization_summary:normalizationSummary,data:analyses})}
    ]});
    const raw = extractAIText(response.result,selectedProvider).trim();
    let content:Record<string,unknown>;
    try {
      const jsonText=raw.replace(/^\`\`\`(?:json)?\s*/i,'').replace(/\s*\`\`\`$/,'').trim();
      content=JSON.parse(jsonText);
    } catch { content={executive_summary:raw,analysis_format:'plain_text',limitations:['模型未返回可解析的结构化 JSON，请查看原始内容并重新生成。']}; }
    const {error}=await supabase.from('market_reports').insert({
      user_id:session.user.id,project_id:projectId,title:`${project.name} · AI 研究报告`,
      report_type:'market_research',content,evidence:[...analyses.map(item=>({task_id:item.taskId,platform_slug:item.platform})),{normalization_summary:normalizationSummary}],
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
      const csv = [keys.map(csvCell).join(','),...rows.map(row=>keys.map(key=>csvCell(row[key])).join(','))].join('\r\n');
      const blob = new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8;'});
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href=url; link.download=`synesis-task-${task.id}-results.csv`; link.click();
      URL.revokeObjectURL(url);
      setNotice({kind:'success',text:`已导出 ${rows.length.toLocaleString()} 条已接收的原始记录。`});
    } catch(e) { setNotice({kind:'error',text:message(e)}); }
    finally { setBusy(false); }
  }

  const title: Record<Page,string> = {dashboard:'情报总览',vault:'AI 模型与 Key Vault',settings:'调研采集设置',projects:projectId?'研究项目详情':'研究项目中心',products:'标准化商品库'};
  const pageDescription: Record<Page,string> = {dashboard:'查看研究进展与关键指标。',vault:'安全管理 AI 与数据连接凭证。',settings:'配置新研究任务的数据采集默认值。',projects:'创建研究项目并管理调研流程。',products:'统一查看和检索跨平台标准化商品。'};
  const pendingPlans = plans.filter(p => p.status === 'pending_approval');
  const searchTerm = search.trim().toLocaleLowerCase();
  const projectSearchResults = searchTerm ? projects.filter(item => [item.name,item.objective].some(value => value.toLocaleLowerCase().includes(searchTerm))).slice(0,6) : [];
  const productSearchResults = searchTerm ? products.filter(item => [item.title,item.brand,item.canonical_key].some(value => (value??'').toLocaleLowerCase().includes(searchTerm))).slice(0,6) : [];
  const taskSearchResults = searchTerm ? tasks.filter(item => item.platform_slug.toLocaleLowerCase().includes(searchTerm)).slice(0,6) : [];

  return (
    <div className={`synesis-app synesis-theme-${theme}`}>
      <Header aria-label="Synesis">
        <a
          className="synesis-skip-link"
          href="#main-content"
          onClick={event => {
            event.preventDefault();
            document.getElementById('main-content')?.focus();
          }}
        >
          跳至主要内容
        </a>
        <HeaderMenuButton aria-label="切换导航" aria-expanded={navExpanded} aria-controls="synesis-navigation" isActive={navExpanded} onClick={() => setNavExpanded(v=>!v)} />
        <HeaderName prefix="" href="#/dashboard">SYNESIS</HeaderName>
        <HeaderGlobalBar>
          <HeaderGlobalAction aria-label="搜索" tooltipAlignment="end" onClick={()=>setSearchOpen(true)}><SearchIcon/></HeaderGlobalAction>
          <HeaderGlobalAction aria-label={theme === 'light' ? '切换到深色主题' : '切换到浅色主题'} tooltipAlignment="end" onClick={()=>setTheme(current=>current === 'light' ? 'dark' : 'light')}><span aria-hidden="true">◐</span></HeaderGlobalAction>
          <HeaderGlobalAction aria-label="账户（点击退出登录）" tooltipAlignment="end" onClick={()=>void signOut()}><UserAvatar/></HeaderGlobalAction>
        </HeaderGlobalBar>
      </Header>
      <WorkspaceNavigation page={page} open={navExpanded} onNavigate={(target)=>navigate(target)} onClose={()=>setNavExpanded(false)}/>
      <Content id="main-content" tabIndex={-1} className="synesis-content">
        <Grid fullWidth className="synesis-page-grid"><Column sm={4} md={8} lg={16} xlg={16}><div className="page-wrap">
          <div className="page-title-row">{page==='projects'&&projectId?<Breadcrumb noTrailingSlash><BreadcrumbItem href="#/dashboard">SYNESIS</BreadcrumbItem><BreadcrumbItem isCurrentPage>WORKSPACE</BreadcrumbItem></Breadcrumb>:<div className="page-heading-copy"><h1 className="page-title">{title[page]}</h1><p className="subheading">{pageDescription[page]}</p></div>}</div>
          {notice && <InlineNotification kind={notice.kind} lowContrast title={notice.kind==='error'?'操作失败':notice.kind==='success'?'操作成功':'系统提示'} subtitle={notice.text} onCloseButtonClick={()=>setNotice(null)}/>}
          {busy && <Loading small withOverlay={false} description="处理中"/>}
          {page==='dashboard' && <WorkspaceDashboard projectCount={projects.length} pendingPlanCount={pendingPlans.length} taskCount={tasks.length} credentialCount={credentials.length} onCreateResearch={()=>navigate('projects')}/>}
          {page==='settings' && <CollectionSettingsPage settings={collectionSettings} onChange={setCollectionSettings} onSave={()=>void saveCollectionSettings()} saving={busy}/>}
          {page==='vault' && <CredentialVault
            credentials={credentials} keyValues={keyValues} setKeyValues={setKeyValues} busy={busy}
            cloudflareAccountId={cloudflareAccountId} setCloudflareAccountId={setCloudflareAccountId}
            integrationMeta={integrationMeta} setIntegrationMeta={setIntegrationMeta}
            providerModels={Object.fromEntries(Object.entries(selectedProviderModels).map(([slug,model])=>[slug,model]))} selectedProvider={selectedProvider} setSelectedProvider={setSelectedProvider}
            models={providerModelsList} selectedModels={selectedProviderModels} onLoadModels={(slug,force)=>void loadProviderModels(slug,force)} onSelectModel={saveProviderModel}
            onSave={(slug,name,kind)=>void saveCredential(slug,name,kind)}
            onTest={(slug,kind)=>void testConnection(slug,kind)}
          />}
          {page==='projects' && <ResearchWizard
            projects={projects} plans={plans} tasks={tasks} reports={reports} projectId={projectId} busy={busy}
            onParse={(brief)=>parseResearchBrief(brief)}
            onCreate={(brief,profile,id)=>void createProject(brief,profile,id)}
            onSaveDraft={(draft,id)=>void saveResearchDraft(draft,id)}
            onOpen={(id)=>navigate('projects',id)}
            onBack={()=>navigate('projects')}
            onGeneratePlan={(project,categories)=>void generateResearchPlan(project,categories)}
            onApprove={(plan)=>setApprovalPlan(plan)}
            onCancel={(task)=>cancelTask(task)}
            onRetry={(task)=>void retryTask(task)}
            onSync={(task)=>void syncTask(task)}
            onView={(task)=>void viewTaskResults(task)}
            onAnalyze={(task)=>void loadAnalytics(task.id)}
            projectResultRows={projectResultRows} projectResultTotal={projectResultTotal} projectResultOffset={projectResultOffset}
            onLoadProjectResults={(id,offset)=>void loadProjectResults(id,offset)}
            analytics={analytics} analyticsTaskId={analyticsTaskId}
            taskLogs={taskLogs} onLoadLogs={(task)=>void loadTaskLogs(task)}
            onSaveAnalytics={()=>void saveAnalyticsReport()}
            onSaveProjectAnalytics={(id)=>void saveProjectAnalytics(id)}
            onGenerateReport={(id)=>{setBusy(true);void generateResearchReport(id).catch(error=>setNotice({kind:'error',text:'AI 报告生成失败：'+message(error)})).finally(()=>setBusy(false));}}
            onStepChange={(id,step)=>void updateResearchWorkflowStep(id,step)}
            onExportProjectResults={(id)=>void exportProjectResults(id)}
          />}
          {page==='projects' && analytics && <section className="module-stack"><AnalyticsDashboard data={analytics} /><Button kind="secondary" onClick={()=>void saveAnalyticsReport()} disabled={busy}>保存数据分析快照</Button></section>}
          {page==='products' && <ProductLibrary
            products={products} productTotal={productTotal} productOffset={productOffset}
            productSearch={productSearch} setProductSearch={setProductSearch} busy={busy}
            selectedProduct={selectedProduct} productHistory={productHistory}
            productHistoryTotal={productHistoryTotal} productHistoryOffset={productHistoryOffset}
            onLoadProducts={(offset,searchValue)=>void loadProducts(offset,searchValue)}
            onLoadHistory={(product,offset)=>void loadProductHistory(product,offset)}
            onSelectProduct={setSelectedProduct} onClearHistory={()=>setProductHistory([])}
          />}
          </div></Column></Grid>
      </Content>
      {searchOpen && <Modal open modalHeading="全局搜索" primaryButtonText="完成" secondaryButtonText="清除" onRequestClose={()=>setSearchOpen(false)} onRequestSubmit={()=>setSearchOpen(false)} onSecondarySubmit={()=>setSearch('')}>
        <TextInput id="global-search" labelText="搜索项目、平台任务和已加载商品" placeholder="输入关键词" value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&search.trim()){setProductSearch(search.trim());setSearchOpen(false);navigate('products');void loadProducts(0,search.trim());}}}/>
        {searchTerm && <section className="synesis-global-search-results" aria-label="搜索结果" aria-live="polite">
          <h3>研究项目</h3>
          {projectSearchResults.length ? projectSearchResults.map(item=><a key={item.id} href={'#/research/'+encodeURIComponent(item.id)} onClick={event=>{event.preventDefault();setSearchOpen(false);navigate('projects',item.id);}}><strong>{item.name}</strong><span>{item.objective}</span></a>) : <p>没有匹配的研究项目。</p>}
          <h3>平台任务</h3>
          {taskSearchResults.length ? taskSearchResults.map(item=><a key={item.id} href={'#/research/'+encodeURIComponent(item.project_id)} onClick={event=>{event.preventDefault();setSearchOpen(false);navigate('projects',item.project_id);}}><strong>{item.platform_slug}</strong><span>{item.status} · {item.id}</span></a>) : <p>没有匹配的平台任务。</p>}
          <h3>当前已加载商品</h3>
          {productSearchResults.length ? productSearchResults.map(item=><a key={item.id} href="#/products" onClick={event=>{event.preventDefault();setProductSearch(search);setSearchOpen(false);navigate('products');void loadProducts(0,search);}}><strong>{item.title||'未命名商品'}</strong><span>{item.brand||'品牌未知'} · {item.canonical_key}</span></a>) : <p>当前商品页没有匹配项；可以继续在商品库中执行完整搜索。</p>}
          <Button kind="tertiary" onClick={()=>{setProductSearch(search);setSearchOpen(false);navigate('products');void loadProducts(0,search);}}>在商品库中搜索“{search}”</Button>
        </section>}
      </Modal>}
      {cancelTaskTarget && <Modal open modalHeading="确认取消采集任务" primaryButtonText="确认取消任务" secondaryButtonText="保留任务" onRequestClose={()=>setCancelTaskTarget(null)} onRequestSubmit={()=>void confirmCancelTask()} primaryButtonDisabled={busy}>
        <p>确定取消这个采集任务？正在运行的 Apify Run 也会尝试终止。已接收的结果会保留。</p>
      </Modal>}
      {resultTask && <Modal open modalHeading={`采集结果 · ${resultTask.platform_slug}`} passiveModal primaryButtonText="关闭" onRequestClose={()=>setResultTask(null)}>
        <p>任务 ID：{resultTask.id} · 当前页显示 {taskResults.length} 条；总计 {resultTotal.toLocaleString()} 条，已同步 {resultSynced.toLocaleString()} 条。</p>
        <div className="card-actions"><Button kind="secondary" size="sm" disabled={resultPage===0} onClick={()=>void viewTaskResults(resultTask,resultPage-1)}>上一页</Button><Tag type="blue">第 {resultPage+1} / {Math.max(1,Math.ceil(resultTotal/100))} 页</Tag><Button kind="secondary" size="sm" disabled={(resultPage+1)*100>=resultSynced} onClick={()=>void viewTaskResults(resultTask,resultPage+1)}>下一页</Button><Button kind="tertiary" size="sm" onClick={()=>void exportTaskResults(resultTask)}>导出已接收 CSV</Button></div><PlatformResultsTable platform={resultTask.platform_slug} rows={taskResults}/><Accordion><AccordionItem title="查看完整原始 JSON（保留 Apify 原始字段）"><pre className="result-json">{JSON.stringify(taskResults,null,2)}</pre></AccordionItem></Accordion>
      </Modal>}
      {approvalPlan && <Modal open modalHeading="确认 Apify 数据采集" primaryButtonText="批准并自动开始采集" secondaryButtonText="返回" onRequestClose={()=>setApprovalPlan(null)} onRequestSubmit={()=>void approvePlan(approvalPlan)} primaryButtonDisabled={busy}>
        <p>{String(approvalPlan.plan.executive_summary??'请确认本次研究计划的采集范围。批准后 Synesis 将自动启动已验证的 Apify 任务，并继续执行数据同步。')}</p>
        <h4>采集任务</h4>
        {(Array.isArray(approvalPlan.plan.platform_tasks)?approvalPlan.plan.platform_tasks:[]).map((item:any,index:number)=><div className="research-plan-row" key={index}><b>{String(item.platform_slug??'未知平台')} · {String(item.actor_title??'Apify Actor')}</b><p>{String(item.purpose??'按研究目标采集数据')}</p><Tag type="green">输入 Schema 已校验</Tag>{item.actor_rating&&<span> · 评分 {String(item.actor_rating)}</span>}</div>)}
        <p>预计费用（AI 估算）：{approvalPlan.estimated_cost===null?'暂不可估算':`$ ${Number(approvalPlan.estimated_cost).toFixed(2)}`}</p>
        <p className="subheading">批准后，采集、结果同步和后续研究步骤将自动推进。</p>
      </Modal>}
    </div>
  );
}



type ResultField = { label:string; patterns:RegExp[] };
type ResultProfile = { title:string; description:string; fields:ResultField[] };
const resultProfiles:Record<string,ResultProfile> = {
 ecommerce:{title:'商品与零售数据',description:'商品标识、价格、品牌、卖家、评分与库存等电商字段。',fields:[
  {label:'商品名称',patterns:[/^(title|name|product.?name|item.?name)$/i]},
  {label:'品牌',patterns:[/^brand(name)?$/i]},
  {label:'商品分类',patterns:[/^(category|department|product.?type)$/i]},
  {label:'当前价格',patterns:[/^(price|sale.?price|current.?price|amount|listing.?price)$/i]},
  {label:'原价',patterns:[/^(original.?price|list.?price|regular.?price|was.?price)$/i]},
  {label:'币种',patterns:[/^(currency|currency.?code|price.?currency)$/i]},
  {label:'评分',patterns:[/^(rating|stars|average.?rating|review.?rating)$/i]},
  {label:'评论数',patterns:[/^(review.?count|reviews.?count|number.?of.?reviews|ratings.?count)$/i]},
  {label:'卖家 / 店铺',patterns:[/^(seller|seller.?name|merchant|store.?name|shop.?name)$/i]},
  {label:'库存 / 状态',patterns:[/^(availability|stock|stock.?status|in.?stock|condition)$/i]},
  {label:'商品链接',patterns:[/^(url|product.?url|link|canonical.?url)$/i]},
 ]},
 social:{title:'社交媒体与内容数据',description:'内容、创作者、发布时间、播放与互动表现。',fields:[
  {label:'内容 / 标题',patterns:[/^(text|caption|title|description|post.?text|content)$/i]},
  {label:'创作者',patterns:[/^(author|author.?name|owner.?username|username|user.?name|creator|channel.?name)$/i]},
  {label:'发布时间',patterns:[/^(timestamp|created.?at|published.?at|date|posted.?at)$/i]},
  {label:'播放量',patterns:[/^views?(?:.?count)?$/i,/^play.?count$/i,/^video.?views?$/i]},
  {label:'点赞数',patterns:[/^likes?(?:.?count)?$/i,/^digg.?count$/i,/^favorite.?count$/i]},
  {label:'评论数',patterns:[/^comments?(?:.?count)?$/i,/^replies?(?:.?count)?$/i]},
  {label:'分享数',patterns:[/^shares?(?:.?count)?$/i,/^repost.?count$/i]},
  {label:'粉丝数',patterns:[/^(followers|follower.?count|subscriber.?count)$/i]},
  {label:'话题 / 标签',patterns:[/^(hashtags|tags|topics)$/i]},
  {label:'内容链接',patterns:[/^(url|post.?url|video.?url|permalink|link)$/i]},
 ]},
 search:{title:'搜索与 SEO 数据',description:'关键词排名、搜索标题、摘要、域名及结果链接。',fields:[
  {label:'搜索标题',patterns:[/^(title|name|heading)$/i]},
  {label:'排名位置',patterns:[/^(position|rank|ranking|organic.?position)$/i]},
  {label:'网址',patterns:[/^(url|link|href|destination.?url)$/i]},
  {label:'显示域名',patterns:[/^(displayed.?url|domain|site|hostname)$/i]},
  {label:'摘要',patterns:[/^(description|snippet|summary|text|body)$/i]},
  {label:'关键词',patterns:[/^(keyword|query|search.?term)$/i]},
  {label:'来源 / 类型',patterns:[/^(source|type|result.?type|engine)$/i]},
  {label:'日期',patterns:[/^(date|published.?at|timestamp)$/i]},
 ]},
 b2b:{title:'企业与商业线索',description:'企业主体、行业、联系人、联系方式、规模与技术信息。',fields:[
  {label:'企业名称',patterns:[/^(company|company.?name|business.?name|organization|name|title)$/i]},
  {label:'行业',patterns:[/^(industry|sector|category|business.?type)$/i]},
  {label:'网站',patterns:[/^(website|domain|url|company.?url)$/i]},
  {label:'联系人',patterns:[/^(contact.?name|person.?name|full.?name|first.?name)$/i]},
  {label:'职位',patterns:[/^(job.?title|position|role|headline)$/i]},
  {label:'邮箱',patterns:[/^(email|email.?address)$/i]},
  {label:'电话',patterns:[/^(phone|phone.?number|telephone)$/i]},
  {label:'所在地',patterns:[/^(address|location|city|country|headquarters)$/i]},
  {label:'员工规模',patterns:[/^(employees|employee.?count|staff.?count|company.?size)$/i]},
  {label:'LinkedIn',patterns:[/^linkedin.?url$/i,/^linkedin$/i]},
 ]},
 jobs:{title:'招聘与职位数据',description:'职位名称、雇主、地点、薪酬、技能与发布时间。',fields:[
  {label:'职位名称',patterns:[/^(title|job.?title|position)$/i]},
  {label:'招聘企业',patterns:[/^(company|company.?name|employer)$/i]},
  {label:'工作地点',patterns:[/^(location|city|country|workplace)$/i]},
  {label:'薪酬',patterns:[/^(salary|salary.?range|compensation|pay)$/i]},
  {label:'雇佣类型',patterns:[/^(employment.?type|job.?type|contract.?type)$/i]},
  {label:'工作模式',patterns:[/^(remote|work.?mode|workplace.?type)$/i]},
  {label:'发布时间',patterns:[/^(date|posted.?at|published.?at|created.?at)$/i]},
  {label:'技能要求',patterns:[/^(skills|requirements|qualifications)$/i]},
  {label:'职位链接',patterns:[/^(url|job.?url|link)$/i]},
 ]},
 realestate:{title:'房产、住宿与本地服务数据',description:'房源、价格、位置、面积、房型及服务评价。',fields:[
  {label:'房源 / 商家名称',patterns:[/^(title|name|listing.?name|property.?name)$/i]},
  {label:'价格',patterns:[/^(price|rent|nightly.?price|amount)$/i]},
  {label:'地址 / 地点',patterns:[/^(address|location|street|city|neighborhood)$/i]},
  {label:'房产类型',patterns:[/^(property.?type|room.?type|listing.?type)$/i]},
  {label:'卧室数',patterns:[/^(bedrooms|beds|bed.?count)$/i]},
  {label:'卫浴数',patterns:[/^(bathrooms|baths|bath.?count)$/i]},
  {label:'面积',patterns:[/^(area|size|square.?feet|sqft|floor.?area)$/i]},
  {label:'评分',patterns:[/^(rating|review.?score|stars)$/i]},
  {label:'评论数',patterns:[/^(review.?count|reviews.?count)$/i]},
  {label:'房源链接',patterns:[/^(url|listing.?url|link)$/i]},
 ]},
 news:{title:'新闻与研究内容数据',description:'新闻标题、媒体来源、作者、发布时间与摘要。',fields:[
  {label:'标题',patterns:[/^(title|headline|name)$/i]},
  {label:'媒体来源',patterns:[/^(source|publisher|publication|domain)$/i]},
  {label:'作者',patterns:[/^(author|byline|creator)$/i]},
  {label:'发布时间',patterns:[/^(published.?at|date|timestamp|created.?at)$/i]},
  {label:'摘要',patterns:[/^(description|summary|snippet|excerpt)$/i]},
  {label:'主题 / 分类',patterns:[/^(category|categories|topic|section)$/i]},
  {label:'文章链接',patterns:[/^(url|link|article.?url)$/i]},
 ]},
 publicdata:{title:'公共数据与政府记录',description:'政府机构、记录编号、监管状态、金额、辖区与日期。',fields:[
  {label:'记录名称',patterns:[/^(title|name|record.?title|case.?name)$/i]},
  {label:'记录编号',patterns:[/^(id|identifier|record.?id|case.?number|document.?number)$/i]},
  {label:'机构 / 部门',patterns:[/^(agency|department|organization|issuer)$/i]},
  {label:'记录状态',patterns:[/^(status|filing.?type|case.?status)$/i]},
  {label:'金额',patterns:[/^(amount|value|award.?amount|contract.?value)$/i]},
  {label:'辖区',patterns:[/^(jurisdiction|country|state|region)$/i]},
  {label:'日期',patterns:[/^(date|filed.?at|filing.?date|published.?at)$/i]},
  {label:'来源链接',patterns:[/^(url|link|source.?url|document.?url)$/i]},
 ]},
 apps:{title:'应用商店数据',description:'应用名称、开发者、评分、评论、安装量与版本。',fields:[
  {label:'应用名称',patterns:[/^(title|app.?name|name)$/i]},
  {label:'开发者',patterns:[/^(developer|developer.?name|publisher)$/i]},
  {label:'评分',patterns:[/^(rating|score|average.?rating)$/i]},
  {label:'评论数',patterns:[/^(review.?count|ratings.?count|reviews)$/i]},
  {label:'安装量',patterns:[/^(installs|downloads|download.?count)$/i]},
  {label:'当前版本',patterns:[/^(version|current.?version|app.?version)$/i]},
  {label:'价格',patterns:[/^(price|currency)$/i]},
  {label:'更新时间',patterns:[/^(updated.?at|released.?at|release.?date)$/i]},
  {label:'应用链接',patterns:[/^(url|app.?url|link)$/i]},
 ]},
};
function classifyResultPlatform(platform:string):{key:string;profile:ResultProfile} {
 const value=platform.toLowerCase();
 const rules:[string,RegExp][]=[
  ['ecommerce',/amazon|ebay|walmart|etsy|aliexpress|shopify|tiktok.?shop|temu|shopee|lazada|tokopedia|allegro|idealo|craigslist|meta.?ad|淘宝|天猫|1688|京东|拼多多|闲鱼|rakuten|乐天|mercari|qoo10|商城/],
  ['apps',/google.?play|play.?store|app.?store|apple.?store|应用商店/],
  ['publicdata',/sec|edgar|usaspending|grants|fec|epa|clinicaltrials|openfda|nhtsa|ofac|court|cms|irs|ted|gleif|政府|公共数据/],
  ['jobs',/indeed|glassdoor|ziprecruiter|wellfound|monster|careerbuilder|remote.?ok|we.?work|himalayas|boss|直聘|51job|智联|猎聘|拉勾|doda|mynavi|jobkorea|saramin|jobstreet|linkedin.?jobs|jobs|招聘/],
  ['b2b',/crunchbase|opencorporates|companies.?house|sunbiz|business.?entity|builtwith|wappalyzer|similarweb|企查查|天眼查|爱企查|企业信用|法人番号|dart|公司注册|google.?maps|商家|linkedin.?company|企业/],
  ['realestate',/zillow|redfin|realtor|apartments|marketplace|rightmove|zoopla|suumo|home.?s|airbnb|booking|trip\.com|expedia|agoda|vrbo|yelp|tripadvisor|trustpilot|大众点评|美团|openrice|hotpepper|房产|住宿/],
  ['news',/google.?news|news|bbc|reuters|techcrunch|wired|times|guardian|financial.?times|bloomberg|hacker.?news|espn|新浪新闻|网易新闻|腾讯新闻|澎湃|36氪|虎嗅|界面|财新|arxiv|huggingface|europe.?pmc|rss/],
  ['social',/tiktok|instagram|youtube|twitter|^x$|linkedin|facebook|reddit|threads|bluesky|pinterest|snapchat|twitch|douyin|抖音|小红书|xiaohongshu|weibo|微博|bilibili|知乎|豆瓣|雪球|line/],
  ['search',/google|bing|baidu|百度|yandex|naver|yahoo|duckduckgo|brave|搜狗|360搜索|autocomplete|trends/],
 ];
 const found=rules.find(([,pattern])=>pattern.test(value));
 const key=found?.[0]??'general';
 return {key,profile:resultProfiles[key]??{title:'平台原始数据',description:'根据当前 Actor 实际返回字段自动生成列；未识别字段会保留在扩展字段中。',fields:[]}};
}
const unifiedResultFields:ResultField[]=[
 {label:'主体 / 标题',patterns:[/^(title|name|product.?name|item.?name|headline|job.?title|company.?name|app.?name|property.?name)$/i]},
 {label:'品牌 / 作者 / 来源',patterns:[/^(brand(name)?|author|creator|publisher|source|seller.?name|developer.?name|company)$/i]},
 {label:'描述 / 内容',patterns:[/^(description|summary|snippet|caption|text|content|excerpt)$/i]},
 {label:'价格 / 金额',patterns:[/^(price|sale.?price|current.?price|amount|salary|award.?amount|contract.?value)$/i]},
 {label:'币种',patterns:[/^(currency|currency.?code|price.?currency)$/i]},
 {label:'评分',patterns:[/^(rating|stars|score|average.?rating|review.?score)$/i]},
 {label:'评论数',patterns:[/^(review.?count|reviews.?count|comments|comment.?count|ratings.?count)$/i]},
 {label:'浏览 / 播放量',patterns:[/^(views|view.?count|play.?count|video.?views|installs|downloads)$/i]},
 {label:'点赞数',patterns:[/^(likes|like.?count|digg.?count|favorite.?count)$/i]},
 {label:'分享数',patterns:[/^(shares|share.?count|repost.?count)$/i]},
 {label:'地区 / 地址',patterns:[/^(location|address|city|country|region|headquarters)$/i]},
 {label:'发布时间 / 日期',patterns:[/^(published.?at|created.?at|posted.?at|timestamp|date|updated.?at)$/i]},
 {label:'来源链接',patterns:[/^(url|link|permalink|source.?url|product.?url|article.?url|job.?url)$/i]},
];
function PlatformResultsTable({platform,rows}:{platform:string;rows:unknown[]}) {
 const records=rows.filter((row):row is Record<string,unknown>=>typeof row==='object'&&row!==null&&!Array.isArray(row));
 const {profile}=classifyResultPlatform(platform);
 const [viewMode,setViewMode]=useState<'unified'|'platform'>('unified');
 const allKeys=Array.from(new Set(records.flatMap(row=>Object.keys(row))));
 const selectedFields=viewMode==='unified'?unifiedResultFields:profile.fields;
 const used=new Set<string>();
 const columns:{key:string;label:string}[]=[];
 for(const field of selectedFields) {
  const match=allKeys.find(name=>!used.has(name)&&field.patterns.some(pattern=>pattern.test(name)));
  if(match){used.add(match);columns.push({key:match,label:field.label});}
 }
 const extras=allKeys.filter(name=>!used.has(name)).slice(0,10);
 columns.push(...extras.map(name=>({key:name,label:name})));
 const format=(value:unknown)=>value===null||value===undefined||value===''?'—':typeof value==='object'?JSON.stringify(value):String(value);
 if(!records.length) return <div className="platform-results-empty"><p>当前页暂无结果记录。</p><small>请等待采集同步完成，或检查任务运行状态。</small></div>;
 const filled=records.reduce((sum,row)=>sum+columns.filter(column=>row[column.key]!==null&&row[column.key]!==undefined&&row[column.key]!=='').length,0);
 const completeness=columns.length?Math.round(filled/(records.length*columns.length)*100):0;
 return <section className="platform-results">
  <div className="platform-results-heading"><div><Tag type="blue">{profile.title}</Tag><h4>{platform} · {viewMode==='unified'?'跨平台通用字段':'平台专属字段'}</h4><p>{viewMode==='unified'?'将不同数据源的同类字段映射为统一列名，便于后续横向比较。':profile.description}</p></div><div className="platform-results-metrics"><b>{records.length.toLocaleString()}</b><span>本页记录</span><b>{columns.length}</b><span>展示字段</span><b>{completeness}%</b><span>字段完整率</span></div></div>
  <div className="platform-results-view-switch"><Button size="sm" kind={viewMode==='unified'?'primary':'tertiary'} aria-pressed={viewMode==='unified'} onClick={()=>setViewMode('unified')}>跨平台通用字段</Button><Button size="sm" kind={viewMode==='platform'?'primary':'tertiary'} aria-pressed={viewMode==='platform'} onClick={()=>setViewMode('platform')}>平台专属字段</Button></div>
  {columns.length?<div className="platform-results-table-wrap"><table className="platform-results-table"><thead><tr><th className="platform-results-index" scope="col">#</th>{columns.map(column=><th key={column.key} scope="col">{column.label}</th>)}</tr></thead><tbody>{records.map((row,index)=><tr key={index}><td className="platform-results-index">{index+1}</td>{columns.map(column=><td key={column.key} title={format(row[column.key])}>{format(row[column.key])}</td>)}</tr>)}</tbody></table></div>:<div className="platform-results-empty"><p>当前返回字段暂时无法映射到该视图。</p><small>请切换到另一视图或查看完整原始 JSON。</small></div>}
  {extras.length>0&&<p className="platform-results-footnote">当前视图已保留 {extras.length} 个 Actor 扩展字段。所有原始字段和嵌套对象均保存在原始 JSON 中，不会因字段映射而丢失。</p>}
 </section>;
}

function AnalyticsDashboard({data}:{data:any}) {
  const metrics=data.metrics??{}, coverage=data.coverage??{}, bands=data.distributions?.price_bands??[];
  const bandsByCurrency=data.distributions?.price_bands_by_currency??[];
  const maxBand=Math.max(1,...bands.map((x:any)=>x.count),...bandsByCurrency.flatMap((g:any)=>g.bands.map((x:any)=>x.count))), words=data.distributions?.words??[];
  const brands=data.distributions?.brands??[], categories=data.distributions?.categories??[], countries=data.distributions?.countries??[], reviewWords=data.distributions?.review_words??[], ratingDistribution=data.distributions?.rating_distribution??[], funnel=data.funnel??{};
  const trends=data.trends??[];
  const trendData=trends.map((point:any)=>({group:'每日商品数量',date:point.date,value:Number(point.count)}));
  const trendOptions:any={resizable:true,height:'240px',axes:{bottom:{title:'日期',mapsTo:'date',scaleType:'labels'},left:{title:'记录数',mapsTo:'value',scaleType:'linear',includeZero:true}},accessibility:{svgAriaLabel:'按商品源时间字段统计的每日商品数量趋势'}};
  const donutData=categories.slice(0,6).map((row:any)=>({group:String(row.label),value:Number(row.count)}));
  const donutOptions:any={resizable:true,height:'260px',donut:{center:{label:'商品类目'}},pie:{valueMapsTo:'value'},legend:{enabled:true,position:'right'},accessibility:{svgAriaLabel:'商品类目占比环形图'}};
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
      <Tile className="analytics-card trend-card"><h3>商品采集时间趋势 · 折线图</h3>{trends.length>1?<><LineChart data={trendData} options={trendOptions}/><p>按原始记录中的日期、创建时间、发布时间或采集时间字段分组。</p></>:<p>当前数据集没有足够的可识别源时间字段，暂不绘制趋势线；不会用同步时间伪造商品趋势。</p>}</Tile>
      <Tile className="analytics-card"><h3>数据采集漏斗</h3><div className="funnel-chart">{stages.map(([label,value])=><div className="funnel-row" key={String(label)}><span>{label}</span><div className="funnel-track"><div style={{width:`${funnel.total?Number(value)/funnel.total*100:0}%`}}/></div><b>{Number(value).toLocaleString()}</b></div>)}</div></Tile>
      <Tile className="analytics-card"><h3>品牌 Top 10</h3><RankList rows={brands}/></Tile>
      <Tile className="analytics-card"><h3>类目 Top 10</h3><RankList rows={categories}/></Tile>
      <Tile className="analytics-card"><h3>国家 / 地区分布</h3><RankList rows={countries}/><p>仅统计采集记录中可识别的国家或地区字段。</p></Tile>
      <Tile className="analytics-card"><h3>评分分布</h3><RankList rows={ratingDistribution.map((row:any)=>({label:String(row.rating)+' 星',count:row.count}))}/></Tile>
      <Tile className="analytics-card word-cloud-card"><h3>消费者评价关键词</h3><div className="word-cloud">{reviewWords.slice(0,32).map((w:any)=><span key={w.label} style={{fontSize:`${Math.max(12,Math.min(30,12+(w.count/(reviewWords[0]?.count||1))*18))}px`}}>{w.label}</span>)}</div><p>仅在采集结果包含可识别的评论文本时生成。</p></Tile>
      <Tile className="analytics-card"><h3>类目占比 · 环形图</h3>{donutData.length?<DonutChart data={donutData} options={donutOptions}/>:<p>暂无可用于类目占比分析的数据。</p>}</Tile>
      <Tile className="analytics-card word-cloud-card"><h3>关键词词云</h3><div className="word-cloud">{words.slice(0,32).map((w:any)=><span key={w.label} style={{fontSize:`${Math.max(12,Math.min(30,12+(w.count/(words[0]?.count||1))*18))}px`}}>{w.label}</span>)}</div></Tile>
      <Tile className="analytics-card"><h3>不同货币价格分布</h3><div className="rank-list">{(data.distributions?.price_by_currency??[]).map((row:any)=><div className="rank-row" key={row.currency}><span>{row.currency}</span><div className="bar-track"><div className="bar-fill" style={{width:`${row.count/Math.max(1,...(data.distributions?.price_by_currency??[]).map((x:any)=>x.count))*100}%`}}/></div><b>{row.count.toLocaleString()}</b><small>均价 {row.average===null?'—':Number(row.average).toLocaleString(undefined,{maximumFractionDigits:2})} · {row.min}–{row.max}</small></div>)}</div><p>不同货币分别统计，避免直接混合币种计算市场均价；未标注货币的数据单独列为 UNKNOWN。</p></Tile>
      <Tile className="analytics-card"><h3>字段完整度</h3><div className="quality-list">{[['标题',data.quality?.title_rate],['价格',data.quality?.price_rate],['货币',data.quality?.currency_rate],['评分',data.quality?.rating_rate],['评论数',data.quality?.reviews_rate],['品牌',data.quality?.brand_rate],['类目',data.quality?.category_rate],['图片',data.quality?.image_rate],['商品链接',data.quality?.link_rate],['SKU/标识',data.quality?.sku_rate],['描述',data.quality?.description_rate],['销量',data.quality?.sales_rate],['库存',data.quality?.stock_rate],['国家/地区',data.quality?.country_rate],['评价文本',data.quality?.review_text_rate]].map(([label,rate]:any)=><div className="quality-row" key={label}><span>{label}</span><b>{Math.round((rate??0)*100)}%</b><div className="bar-track"><div className="bar-fill" style={{width:`${(rate??0)*100}%`}}/></div></div>)}</div></Tile>
    </div>
    <Tile><h3>分析口径与覆盖范围</h3><p>价格、评分、评论数、品牌和类目通过常见字段别名识别；源数据保持原样，不会因字段映射而丢失。价格区间按币种独立计算；当数据集包含多种币种或未标注币种时，不生成混合均价、中位数或分位数。</p><p>本次分析覆盖 {coverage.analyzed.toLocaleString()} 条，数据集已同步 {coverage.available.toLocaleString()} 条。商品关键词由标题、品牌和类目文本生成；消费者评价关键词仅从数据源明确提供的评论文本生成。国家/地区和评分分布同样依赖来源字段，缺失时不会推算。</p></Tile>
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

function message(e: unknown) {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object') {
    const error=e as Record<string,unknown>;
    const parts=[error.message,error.details,error.hint,error.code].filter(value=>typeof value==='string'&&value.trim()).map(String);
    if(parts.length)return parts.join(' · ');
  }
  if(typeof e==='string'&&e.trim())return e;
  return '发生未知错误，请稍后重试。';
}
export default App;
