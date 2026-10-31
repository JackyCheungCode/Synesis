import React from 'react';
import { Button, Tag, TextArea, TextInput, Tile } from '@carbon/react';
import { Add, ArrowLeft, ArrowRight, CheckmarkFilled, Renew, ChartLine } from '@carbon/icons-react';

export type ResearchDimension = { key:string; label:string; values:string[]; status:'provided'|'suggested'|'needs_confirmation'|'user_confirmed'; note?:string };
export type ResearchProfile = { summary:string; dimensions:ResearchDimension[]; research_goals:string[]; assumptions:string[]; missing_information:string[] };
export type ResearchProject = { id:string; name:string; objective:string; status:string; target_regions:string[]; platform_slugs:string[]; scope?:Record<string,any> };
export type ResearchPlan = { id:string; project_id:string; status:string; plan:Record<string,any>; estimated_cost:number|null; created_at:string };
export type ResearchTask = { id:string; project_id:string; platform_slug:string; status:string; actor_id:string|null; created_at:string; progress?:number; result_count?:number; result_synced_count?:number; run_status?:string|null; error_message?:string|null };
export type ResearchReport = { id:string; title:string; status:string; created_at:string; project_id:string|null; content:Record<string,any> };
type Props = {
 projects:ResearchProject[]; plans:ResearchPlan[]; tasks:ResearchTask[]; reports:ResearchReport[];
 projectId?:string; busy:boolean; onParse:(brief:string)=>Promise<ResearchProfile>; onCreate:(brief:string,profile:ResearchProfile)=>void;
 onOpen:(id:string)=>void; onBack:()=>void; onApprove:(plan:ResearchPlan)=>void; onCancel:(task:ResearchTask)=>void;
 onRetry:(task:ResearchTask)=>void; onSync:(task:ResearchTask)=>void; onView:(task:ResearchTask)=>void; onAnalyze:(task:ResearchTask)=>void;
};
const stages=['需求输入与解析','数据平台选择','数据汇总整理','AI 深度分析','研究报告'];
const statusLabel:Record<ResearchDimension['status'],string>={provided:'用户已提供',suggested:'AI 建议',needs_confirmation:'待补充确认',user_confirmed:'用户已确认'};
const statusType:Record<ResearchDimension['status'],string>={provided:'green',suggested:'blue',needs_confirmation:'warm-gray',user_confirmed:'green'};
const dimensionGroups=[
 {title:'市场与地域',description:'确定研究覆盖的国家、地区和语言。',keys:['keywords','languages','countries','regions','time_range']},
 {title:'商品与品牌',description:'定义研究对象、产品范围和竞品边界。',keys:['product_categories','product_attributes','brands','models_identifiers','price_range','usage_scenarios','certifications']},
 {title:'商业与渠道',description:'描述客户、销售路径、供应链和研究范围。',keys:['target_customers','sales_channels','competitors','reference_urls','origin_supply_markets','logistics_attributes','exclusions']},
];
function stageIndex(project:ResearchProject,plan:ResearchPlan|undefined,tasks:ResearchTask[],reports:ResearchReport[]) {
 if(reports.length)return 4;
 if(tasks.length&&tasks.every(t=>t.status==='succeeded'&&Number(t.result_synced_count??0)>=Number(t.result_count??0)))return 3;
 if(tasks.length&&tasks.every(t=>t.status==='succeeded'))return 2;
 if(tasks.some(t=>['queued','running'].includes(t.status)))return 1;
 if(plan?.status==='pending_approval'||plan?.status==='approved')return 1;
 if(project.status==='completed')return 4;
 return 0;
}
export function ResearchWizard(props:Props) {
 const {projects,plans,tasks,reports,projectId,busy,onParse,onCreate,onOpen,onBack,onApprove,onCancel,onRetry,onSync,onView,onAnalyze}=props;
 const [brief,setBrief]=React.useState('');
 const [profile,setProfile]=React.useState<ResearchProfile|null>(null);
 const [parseError,setParseError]=React.useState('');
 const [customLabel,setCustomLabel]=React.useState('');
 const [customValue,setCustomValue]=React.useState('');
 const project=projects.find(p=>p.id===projectId);
 const projectPlans=plans.filter(p=>p.project_id===projectId); const plan=projectPlans[0];
 const projectTasks=tasks.filter(t=>t.project_id===projectId); const projectReports=reports.filter(r=>r.project_id===projectId);
 const currentStage=project?stageIndex(project,plan,projectTasks,projectReports):0;
 const proposedTasks=Array.isArray(plan?.plan?.platform_tasks)?plan.plan.platform_tasks:[];
 const actorsReady=proposedTasks.length>0&&proposedTasks.every((task:any)=>typeof task.actor_id==='string'&&task.actor_id.trim().length>0&&task.schema_valid===true);
 const synced=projectTasks.reduce((sum,t)=>sum+Number(t.result_synced_count??0),0);
 const expected=projectTasks.reduce((sum,t)=>sum+Number(t.result_count??0),0);
 const allSynced=projectTasks.length>0&&projectTasks.every(t=>t.status==='succeeded'&&Number(t.result_synced_count??0)>=Number(t.result_count??0));
 async function parseBrief(){if(!brief.trim())return;setParseError('');try{setProfile(await onParse(brief.trim()));}catch(error){setParseError(error instanceof Error?error.message:'AI 解析失败，请稍后重试。');}}
 function updateDimension(key:string,raw:string){if(!profile)return;const values=raw.split(/\n|,/).map(value=>value.trim()).filter(Boolean);setProfile({...profile,dimensions:profile.dimensions.map(item=>item.key===key?{...item,values,status:'user_confirmed'}:item)});}
 function addCustomDimension(){if(!profile||!customLabel.trim()||!customValue.trim())return;setProfile({...profile,dimensions:[...profile.dimensions,{key:'custom_'+Date.now(),label:customLabel.trim(),values:customValue.split(/\n|,/).map(v=>v.trim()).filter(Boolean),status:'user_confirmed'}]});setCustomLabel('');setCustomValue('');}
 const confirmedCount=profile?.dimensions.filter(item=>item.status==='provided'||item.status==='user_confirmed').length??0;
 const suggestedCount=profile?.dimensions.filter(item=>item.status==='suggested').length??0;
 const missingCount=profile?.dimensions.filter(item=>item.status==='needs_confirmation').length??0;
 if(!project)return <section className="module-stack research-workspace">
  <Tile className="research-start-tile">
   <p className="eyebrow">STEP 1 / RESEARCH INPUT</p><h2>描述你要研究的市场或商业问题</h2>
   <p>可以一次输入关键词、目标国家和地区、产品属性、品牌、型号、价格范围、参考 URL、客户群体、销售渠道、时间范围及研究目标。信息不完整也没关系，AI 会先整理并标记需要确认的内容。</p>
   <TextArea id="research-brief" labelText="研究需求" hideLabel value={brief} onChange={e=>{setBrief(e.target.value);setProfile(null);}} rows={6} placeholder="例如：研究德国、法国和意大利的宠物智能用品市场，重点关注智能喂食器和自动猫砂盆。分析主要品牌、产品规格、价格区间、消费者评价、社交热度和潜在供应商。"/>
   <div className="research-start-actions"><span>支持自然语言与 URL；无需填写 Actor 或技术参数。</span><Button kind="primary" renderIcon={Renew} disabled={!brief.trim()||busy} onClick={()=>void parseBrief()}>AI 解析研究需求</Button></div>
   {parseError&&<p className="error-text">{parseError}</p>}
  </Tile>
  {profile&&<Tile className="research-profile-tile">
   <div className="module-heading"><div><p className="eyebrow">AI STRUCTURED RESEARCH PROFILE</p><h2>检查 AI 解析结果</h2><p>{profile.summary}</p></div><Tag type="green">解析完成</Tag></div>
   <div className="research-profile-stats"><Tag type="green">{confirmedCount} 项已明确</Tag><Tag type="blue">{suggestedCount} 项 AI 建议</Tag><Tag type="warm-gray">{missingCount} 项待补充</Tag></div>
   <p className="research-profile-hint">绿色代表来自你的输入或你已确认；蓝色代表 AI 补充建议；灰色代表尚未提供。请检查并修改，AI 建议不会被当作已确认事实。</p>
   {dimensionGroups.map(group=><div className="research-dimension-group" key={group.title}><div><h3>{group.title}</h3><p>{group.description}</p></div><div className="research-dimension-grid">
    {profile.dimensions.filter(item=>group.keys.includes(item.key)).map(item=><div className="research-dimension" key={item.key}>
     <div className="research-dimension-heading"><b>{item.label}</b><Tag type={statusType[item.status]}>{statusLabel[item.status]}</Tag></div>
     <TextArea id={'dimension-'+item.key} labelText={item.label} hideLabel rows={2} value={item.values.join('\n')} placeholder="未提供，可留空或补充" onChange={e=>updateDimension(item.key,e.target.value)}/>{item.note&&<small>{item.note}</small>}
    </div>)}
   </div></div>)}
   {profile.dimensions.some(item=>!dimensionGroups.some(group=>group.keys.includes(item.key)))&&<div className="research-dimension-group"><h3>其他补充维度</h3><div className="research-dimension-grid">
    {profile.dimensions.filter(item=>!dimensionGroups.some(group=>group.keys.includes(item.key))).map(item=><div className="research-dimension" key={item.key}><div className="research-dimension-heading"><b>{item.label}</b><Tag type={statusType[item.status]}>{statusLabel[item.status]}</Tag></div><TextArea id={'dimension-'+item.key} labelText={item.label} hideLabel rows={2} value={item.values.join('\n')} placeholder="未提供，可留空或补充" onChange={e=>updateDimension(item.key,e.target.value)}/>{item.note&&<small>{item.note}</small>}</div>)}
   </div></div>}
   <div className="research-dimension-group"><h3>添加自定义研究维度</h3><div className="research-custom-dimension"><TextInput id="custom-dimension-label" labelText="维度名称" value={customLabel} onChange={e=>setCustomLabel(e.target.value)} placeholder="例如：认证要求"/><TextInput id="custom-dimension-value" labelText="维度内容" value={customValue} onChange={e=>setCustomValue(e.target.value)} placeholder="例如：CE、RoHS"/><Button kind="tertiary" renderIcon={Add} disabled={!customLabel.trim()||!customValue.trim()} onClick={addCustomDimension}>添加维度</Button></div></div>
   <div className="research-dimension-group"><h3>研究目标</h3><TextArea id="research-goals" labelText="研究目标" rows={3} value={profile.research_goals.join('\n')} onChange={e=>setProfile({...profile,research_goals:e.target.value.split('\n').map(v=>v.trim()).filter(Boolean)})}/></div>
   {profile.assumptions.length>0&&<div className="research-profile-notes"><b>AI 推断与假设（请留意）</b>{profile.assumptions.map((item,index)=><p key={index}>{item}</p>)}</div>}
   {profile.missing_information.length>0&&<div className="research-profile-notes"><b>尚未明确的信息</b>{profile.missing_information.map((item,index)=><p key={index}>{item}</p>)}</div>}
   <div className="research-start-actions"><span>确认后保存研究条件；不会在本步骤启动采集。</span><Button kind="primary" disabled={busy||!profile.dimensions.some(item=>item.values.length>0)} onClick={()=>onCreate(brief,profile)}>确认研究条件并保存 <ArrowRight size={16}/></Button></div>
  </Tile>}
  <div className="module-heading"><div><h2>我的研究项目</h2><p>每项研究都保留已确认的研究条件、采集记录和最终报告。</p></div><Tag type="blue">{projects.length} 个项目</Tag></div>
  <div className="project-card-grid">{projects.map(item=><Tile key={item.id} className="list-tile"><div><h3>{item.name}</h3><p>{item.objective}</p><Tag type={item.status==='completed'?'green':'blue'}>{item.status}</Tag></div><Button kind="ghost" renderIcon={ArrowRight} onClick={()=>onOpen(item.id)}>查看研究</Button></Tile>)}</div>
  {!projects.length&&<Tile><p>还没有研究项目。输入上方研究需求即可开始。</p></Tile>}
 </section>;
 const projectStageTasks=proposedTasks.map((task:any)=>({platform:String(task.platform_slug??'平台'),actorTitle:String(task.actor_title??'待选择采集器'),purpose:String(task.purpose??task.description??'按研究需求采集相关数据'),schemaValid:task.schema_valid===true,validationErrors:Array.isArray(task.validation_errors)?task.validation_errors:[],estimatedItems:task.estimated_items,pricingModel:String(task.pricing_model??'未提供'),rating:task.actor_rating}));
 const savedProfile=project.scope?.research_profile as ResearchProfile|undefined;
 const isStepOneSaved=!plan&&!projectTasks.length&&!projectReports.length&&Boolean(savedProfile);
 if(isStepOneSaved)return <section className="module-stack research-workspace">
  <div className="research-detail-heading"><Button kind="ghost" renderIcon={ArrowLeft} onClick={onBack}>全部研究</Button><div><p className="eyebrow">RESEARCH PROJECT · STEP 1 COMPLETE</p><h2>{project.name}</h2><p>{savedProfile.summary}</p></div><Tag type="green">第一步已完成</Tag></div>
  <Tile><h3>五步研究流程</h3><div className="research-stepper">{stages.map((label,index)=><div className={'research-step'+(index===0?' is-complete':index===1?' is-current':'')} key={label}><span>{index===0?<CheckmarkFilled size={18}/>:index+1}</span><b>{label}</b></div>)}</div><p className="research-profile-hint">研究条件已保存。下一步将根据这些条件发现可用数据平台，并由你选择采集渠道。</p></Tile>
  <Tile><h3>已确认的研究条件</h3><p>{savedProfile.summary}</p><div className="research-profile-stats"><Tag type="green">{savedProfile.dimensions.filter(item=>item.status==='provided'||item.status==='user_confirmed').length} 项已确认</Tag><Tag type="blue">{savedProfile.dimensions.filter(item=>item.status==='suggested').length} 项 AI 建议</Tag><Tag type="warm-gray">{savedProfile.dimensions.filter(item=>item.status==='needs_confirmation').length} 项待补充</Tag></div>{savedProfile.dimensions.filter(item=>item.values.length).map(item=><div className="research-saved-row" key={item.key}><b>{item.label}</b><p>{item.values.join(' · ')}</p></div>)}</Tile>
  <Tile><div className="module-heading"><div><h3>第二步 · 数据平台选择</h3><p>下一阶段开放：按研究条件发现真实可用的 Apify Actors 和其他数据来源。</p></div><Tag type="warm-gray">尚未开放</Tag></div><p>本项目尚未创建采集计划，也没有启动任何 Apify 任务。</p></Tile>
 </section>;
 return <section className="module-stack research-workspace">
  <div className="research-detail-heading"><Button kind="ghost" renderIcon={ArrowLeft} onClick={onBack}>全部研究</Button><div><p className="eyebrow">RESEARCH PROJECT</p><h2>{project.name}</h2><p>{project.objective}</p></div><Tag type={project.status==='completed'?'green':'blue'}>{project.status}</Tag></div>
  <Tile className="research-progress-tile"><div className="module-heading"><div><h3>研究进度</h3><p>只在 Apify 采集开始前需要你确认，之后自动执行。</p></div><Tag type="blue">第 {Math.min(5,currentStage+1)} / 5 步</Tag></div><div className="research-stepper">{stages.map((label,index)=><div className={'research-step'+(index<currentStage?' is-complete':index===currentStage?' is-current':'')} key={label}><span>{index<currentStage?<CheckmarkFilled size={18}/>:index+1}</span><b>{label}</b></div>)}</div></Tile>
  <Tile><h3>第一步 · 研究需求</h3><p>{project.objective}</p><div className="tag-row">{(project.target_regions??[]).map(region=><Tag key={region}>{region}</Tag>)}{(project.platform_slugs??[]).map(platform=><Tag key={platform} type="blue">{platform}</Tag>)}</div></Tile>
  <Tile><div className="module-heading"><div><h3>第二步 · Apify 采集计划</h3><p>审核采集目标、内容和预期成本。技术参数由系统管理。</p></div><Tag type={plan?.status==='pending_approval'?'warm-gray':plan?.status==='approved'?'green':'blue'}>{plan?.status??'计划生成中'}</Tag></div>
   {plan&&<><p>{String(plan.plan.executive_summary??'AI 已生成研究采集计划。')}</p><div className="research-plan-list">{projectStageTasks.map((task:any,index:number)=><div className="research-plan-row" key={index}><div><b>{task.platform} · {task.actorTitle}</b><p>{task.purpose}</p><p>预计记录：{task.estimatedItems??'未估算'} · 计费：{task.pricingModel}{task.rating?' · 评分 '+task.rating:''}</p>{task.schemaValid?<Tag type="green">输入参数已校验</Tag>:<Tag type="warm-gray">需要调整采集配置</Tag>}{task.validationErrors.map((error:string)=><p key={error}>{error}</p>)}</div></div>)}</div><div className="research-plan-meta"><span>预计费用（AI 估算）：{plan.estimated_cost===null?'暂不可估算':'$ '+Number(plan.estimated_cost).toFixed(2)}</span><span>采集任务：{proposedTasks.length}</span></div>{plan.status==='pending_approval'&&<div className="research-approval"><p>{actorsReady?'采集器来自 Apify Store，输入参数已按对应 Actor Schema 校验；批准时服务器还会重新检查 Actor 是否可访问。':'未找到符合研究需求且输入参数通过 Schema 校验的 Apify Actor，系统不会猜测 Actor 或启动采集。可调整研究需求后重新生成计划。'}</p><Button kind="primary" disabled={!actorsReady||busy} onClick={()=>onApprove(plan)}>批准并开始自动研究</Button></div>}</>}
   {!plan&&<p>AI 正在生成采集计划。</p>}
  </Tile>
  <Tile><div className="module-heading"><div><h3>第三步 · 数据汇总</h3><p>Apify Dataset 完整同步后，才会进入正式分析。</p></div><Tag type={allSynced?'green':'blue'}>{allSynced?'同步完成':'处理中'}</Tag></div><div className="research-data-count"><strong>{synced.toLocaleString()}</strong><span> / {expected.toLocaleString()} 条已同步</span></div>
   {projectTasks.map(task=><div className="research-task-row" key={task.id}><div><b>{task.platform_slug}</b><p>{task.status} · {task.run_status??'等待运行'} · {Number(task.result_synced_count??0).toLocaleString()} / {Number(task.result_count??0).toLocaleString()}</p>{task.error_message&&<p className="error-text">{task.error_message}</p>}</div><div className="card-actions">{task.status==='failed'&&<Button size="sm" kind="tertiary" renderIcon={Renew} onClick={()=>onRetry(task)}>重试</Button>}{(['queued','running'].includes(task.status)||(task.status==='succeeded'&&Number(task.result_synced_count??0)<Number(task.result_count??0)))&&<Button size="sm" kind="ghost" renderIcon={Renew} onClick={()=>onSync(task)}>同步</Button>}{['queued','running'].includes(task.status)&&<Button size="sm" kind="danger--tertiary" onClick={()=>onCancel(task)}>取消</Button>}{task.status==='succeeded'&&<Button size="sm" kind="ghost" onClick={()=>onView(task)}>结果</Button>}</div></div>)}
  </Tile>
  <Tile><div className="module-heading"><div><h3>第四步 · AI 深度分析</h3><p>只使用已完整同步的数据，结论保留数据来源和覆盖范围。</p></div><Tag type={projectReports.length?'green':'blue'}>{projectReports.length?'已生成':'等待数据完成'}</Tag></div>{allSynced?projectTasks.map(task=><div className="research-task-row" key={task.id}><span>{task.platform_slug} · 已同步完成</span><Button size="sm" kind="tertiary" renderIcon={ChartLine} onClick={()=>onAnalyze(task)}>生成数据分析</Button></div>):<p>所有采集任务及 Dataset 同步完成后，才能开始分析。</p>}</Tile>
  <Tile><div className="module-heading"><div><h3>第五步 · 研究报告</h3><p>报告、分析快照和数据证据统一保存在当前研究项目。</p></div><Tag type={projectReports.length?'green':'blue'}>{projectReports.length} 份报告</Tag></div>{projectReports.map(report=><div className="report-row" key={report.id}><div><strong>{report.title}</strong><p>{new Date(report.created_at).toLocaleString()} · {report.status}</p></div><Tag type="green">已保存</Tag></div>)}{!projectReports.length&&<p>完成数据分析后，研究报告会出现在这里。</p>}</Tile>
 </section>;
}
