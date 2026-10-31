import { Button, Tag, TextArea, Tile } from '@carbon/react';
import { Add, ArrowLeft, ArrowRight, CheckmarkFilled, Renew, ChartLine } from '@carbon/icons-react';

export type ResearchProject = { id:string; name:string; objective:string; status:string; target_regions:string[]; platform_slugs:string[] };
export type ResearchPlan = { id:string; project_id:string; status:string; plan:Record<string,any>; estimated_cost:number|null; created_at:string };
export type ResearchTask = { id:string; project_id:string; platform_slug:string; status:string; actor_id:string|null; created_at:string; progress?:number; result_count?:number; result_synced_count?:number; run_status?:string|null; error_message?:string|null };
export type ResearchReport = { id:string; title:string; status:string; created_at:string; project_id:string|null; content:Record<string,any> };

type Props = {
  projects: ResearchProject[]; plans: ResearchPlan[]; tasks: ResearchTask[]; reports: ResearchReport[];
  projectId?: string; busy: boolean; onCreate: (brief:string)=>void; onOpen: (id:string)=>void; onBack:()=>void;
  onApprove:(plan:ResearchPlan)=>void; onCancel:(task:ResearchTask)=>void; onRetry:(task:ResearchTask)=>void;
  onSync:(task:ResearchTask)=>void; onView:(task:ResearchTask)=>void; onAnalyze:(task:ResearchTask)=>void;
};

const stages = ['输入需求','Apify 采集','数据汇总','AI 分析','研究报告'];

function stageIndex(project:ResearchProject, plan:ResearchPlan|undefined, tasks:ResearchTask[], reports:ResearchReport[]) {
  if (reports.length) return 4;
  if (tasks.length && tasks.every(t=>t.status==='succeeded' && Number(t.result_synced_count??0)>=Number(t.result_count??0))) return 3;
  if (tasks.some(t=>['queued','running'].includes(t.status))) return 1;
  if (plan?.status==='pending_approval' || plan?.status==='approved') return 1;
  if (project.status==='completed') return 4;
  return 0;
}

export function ResearchWizard(props:Props) {
  const {projects,plans,tasks,reports,projectId,busy,onCreate,onOpen,onBack,onApprove,onCancel,onRetry,onSync,onView,onAnalyze}=props;
  const [brief,setBrief]=React.useState('');
  const project=projects.find(p=>p.id===projectId);
  const projectPlans=plans.filter(p=>p.project_id===projectId);
  const plan=projectPlans[0];
  const projectTasks=tasks.filter(t=>t.project_id===projectId);
  const projectReports=reports.filter(r=>r.project_id===projectId);
  const currentStage=project?stageIndex(project,plan,projectTasks,projectReports):0;
  const proposedTasks=Array.isArray(plan?.plan?.platform_tasks)?plan.plan.platform_tasks:[];
  const actorsReady=proposedTasks.length>0 && proposedTasks.every((task:any)=>typeof task.actor_id==='string' && task.actor_id.trim().length>0);
  const synced=projectTasks.reduce((sum,t)=>sum+Number(t.result_synced_count??0),0);
  const expected=projectTasks.reduce((sum,t)=>sum+Number(t.result_count??0),0);
  const allSynced=projectTasks.length>0 && projectTasks.every(t=>t.status==='succeeded' && Number(t.result_synced_count??0)>=Number(t.result_count??0));

  if (!project) return <section className="module-stack research-workspace">
    <Tile className="research-start-tile">
      <p className="eyebrow">AI RESEARCH WORKSPACE</p><h2>开始一项新研究</h2>
      <p>描述你要研究的市场、商品或商业问题。Synesis 将生成采集计划，待你批准后自动执行后续流程。</p>
      <TextArea id="research-brief" labelText="研究需求" hideLabel value={brief} onChange={e=>setBrief(e.target.value)} rows={5} placeholder="例如：研究美国市场的家居收纳品类，分析热销商品、价格区间、主要竞争对手、消费者评论和潜在市场机会……"/>
      <div className="research-start-actions"><span>自然语言即可，不必填写 Actor 或技术参数</span><Button kind="primary" renderIcon={Add} disabled={!brief.trim()||busy} onClick={()=>onCreate(brief.trim())}>开始 AI 研究</Button></div>
    </Tile>
    <div className="module-heading"><div><h2>我的研究项目</h2><p>每项研究都保留采集记录、数据汇总和最终报告。</p></div><Tag type="blue">{projects.length} 个项目</Tag></div>
    <div className="project-card-grid">{projects.map(item=><Tile key={item.id} className="list-tile"><div><h3>{item.name}</h3><p>{item.objective}</p><Tag type={item.status==='completed'?'green':'blue'}>{item.status}</Tag></div><Button kind="ghost" renderIcon={ArrowRight} onClick={()=>onOpen(item.id)}>查看研究</Button></Tile>)}</div>
    {!projects.length&&<Tile><p>还没有研究项目。输入上方研究需求即可开始。</p></Tile>}
  </section>;

  const projectStageTasks=proposedTasks.map((task:any)=>({platform:String(task.platform_slug??'平台'),purpose:String(task.purpose??task.description??'按研究需求采集相关数据')}));
  return <section className="module-stack research-workspace">
    <div className="research-detail-heading"><Button kind="ghost" renderIcon={ArrowLeft} onClick={onBack}>全部研究</Button><div><p className="eyebrow">RESEARCH PROJECT</p><h2>{project.name}</h2><p>{project.objective}</p></div><Tag type={project.status==='completed'?'green':'blue'}>{project.status}</Tag></div>
    <Tile className="research-progress-tile">
      <div className="module-heading"><div><h3>研究进度</h3><p>只在 Apify 采集开始前需要你确认，之后自动执行。</p></div><Tag type="blue">第 {Math.min(5,currentStage+1)} / 5 步</Tag></div>
      <div className="research-stepper">{stages.map((label,index)=><div className={`research-step${index<currentStage?' is-complete':index===currentStage?' is-current':''}`} key={label}><span>{index<currentStage?<CheckmarkFilled size={18}/>:index+1}</span><b>{label}</b></div>)}</div>
    </Tile>
    <Tile>
      <h3>第一步 · 研究需求</h3><p>{project.objective}</p><div className="tag-row">{(project.target_regions??[]).map(region=><Tag key={region}>{region}</Tag>)}{(project.platform_slugs??[]).map(platform=><Tag key={platform} type="blue">{platform}</Tag>)}</div>
    </Tile>
    <Tile>
      <div className="module-heading"><div><h3>第二步 · Apify 采集计划</h3><p>审核采集目标、内容和预期成本。技术参数由系统管理。</p></div><Tag type={plan?.status==='pending_approval'?'warm-gray':plan?.status==='approved'?'green':'blue'}>{plan?.status??'计划生成中'}</Tag></div>
      {plan&&<><p>{String(plan.plan.executive_summary??'AI 已生成研究采集计划。')}</p><div className="research-plan-list">{projectStageTasks.map((task:any,index:number)=><div className="research-plan-row" key={index}><div><b>{task.platform}</b><p>{task.purpose}</p></div></div>)}</div><div className="research-plan-meta"><span>预计费用：{plan.estimated_cost===null?'暂不可估算':`$ ${Number(plan.estimated_cost).toFixed(2)}`}</span><span>采集任务：{proposedTasks.length}</span></div>
      {plan.status==='pending_approval'&&<div className="research-approval"><p>{actorsReady?'Actor ID 已填写。批准时服务器会先检查 Actor 是否存在、可访问且未弃用，再启动采集。':'AI 尚未提供可验证的 Apify Actor ID，系统不会猜测 Actor 或启动采集。请先完善后台 Actor 目录。'}</p><Button kind="primary" disabled={!actorsReady||busy} onClick={()=>onApprove(plan)}>批准并开始自动研究</Button></div>}</>}
      {!plan&&<p>AI 正在生成采集计划。</p>}
    </Tile>
    <Tile>
      <div className="module-heading"><div><h3>第三步 · 数据汇总</h3><p>Apify Dataset 完整同步后，才会进入正式分析。</p></div><Tag type={allSynced?'green':'blue'}>{allSynced?'同步完成':'处理中'}</Tag></div>
      <div className="research-data-count"><strong>{synced.toLocaleString()}</strong><span> / {expected.toLocaleString()} 条已同步</span></div>
      {projectTasks.map(task=><div className="research-task-row" key={task.id}><div><b>{task.platform_slug}</b><p>{task.status} · {task.run_status??'等待运行'} · {Number(task.result_synced_count??0).toLocaleString()} / {Number(task.result_count??0).toLocaleString()}</p>{task.error_message&&<p className="error-text">{task.error_message}</p>}</div><div className="card-actions">{task.status==='failed'&&<Button size="sm" kind="tertiary" renderIcon={Renew} onClick={()=>onRetry(task)}>重试</Button>}{(['queued','running'].includes(task.status)||(task.status==='succeeded'&&Number(task.result_synced_count??0)<Number(task.result_count??0)))&&<Button size="sm" kind="ghost" renderIcon={Renew} onClick={()=>onSync(task)}>同步</Button>}{['queued','running'].includes(task.status)&&<Button size="sm" kind="danger--tertiary" onClick={()=>onCancel(task)}>取消</Button>}{task.status==='succeeded'&&<Button size="sm" kind="ghost" onClick={()=>onView(task)}>结果</Button>}</div></div>)}
    </Tile>
    <Tile>
      <div className="module-heading"><div><h3>第四步 · AI 深度分析</h3><p>只使用已完整同步的数据，结论保留数据来源和覆盖范围。</p></div><Tag type={projectReports.length?'green':'blue'}>{projectReports.length?'已生成':'等待数据完成'}</Tag></div>
      {allSynced?projectTasks.map(task=><div className="research-task-row" key={task.id}><span>{task.platform_slug} · 已同步完成</span><Button size="sm" kind="tertiary" renderIcon={ChartLine} onClick={()=>onAnalyze(task)}>生成数据分析</Button></div>):<p>所有采集任务及 Dataset 同步完成后，才能开始分析。</p>}
    </Tile>
    <Tile>
      <div className="module-heading"><div><h3>第五步 · 研究报告</h3><p>报告、分析快照和数据证据统一保存在当前研究项目。</p></div><Tag type={projectReports.length?'green':'blue'}>{projectReports.length} 份报告</Tag></div>
      {projectReports.map(report=><div className="report-row" key={report.id}><div><strong>{report.title}</strong><p>{new Date(report.created_at).toLocaleString()} · {report.status}</p></div><Tag type="green">已保存</Tag></div>)}
      {!projectReports.length&&<p>完成数据分析后，研究报告会出现在这里。</p>}
    </Tile>
  </section>;
}
import React from 'react';
