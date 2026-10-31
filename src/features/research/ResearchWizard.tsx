import React from 'react';
import { Button, Tag, TextArea, TextInput, Tile } from '@carbon/react';
import { Add, ArrowLeft, ArrowRight, CheckmarkFilled, Renew, ChartLine } from '@carbon/icons-react';

export type ResearchDimension = { key:string; label:string; values:string[]; status:'provided'|'suggested'|'needs_confirmation'|'user_confirmed'; note?:string };
export type ResearchProfile = { summary:string; dimensions:ResearchDimension[]; research_goals:string[]; assumptions:string[]; missing_information:string[] };
export type ResearchProject = { id:string; name:string; objective:string; status:string; target_regions:string[]; platform_slugs:string[]; scope?:Record<string,any> };
export type ResearchPlan = { id:string; project_id:string; status:string; plan:Record<string,any>; estimated_cost:number|null; created_at:string };
export type ResearchTask = { id:string; project_id:string; platform_slug:string; status:string; actor_id:string|null; created_at:string; started_at?:string|null; finished_at?:string|null; updated_at?:string|null; external_run_id?:string|null; progress?:number; result_count?:number; result_synced_count?:number; run_status?:string|null; error_message?:string|null };
export type ResearchReport = { id:string; title:string; status:string; created_at:string; project_id:string|null; report_type?:string; evidence?:Array<{task_id?:string;platform_slug?:string}>; content:Record<string,any> };
type Props = {
 projects:ResearchProject[]; plans:ResearchPlan[]; tasks:ResearchTask[]; reports:ResearchReport[];
 projectId?:string; busy:boolean; onParse:(brief:string)=>Promise<ResearchProfile>; onCreate:(brief:string,profile:ResearchProfile)=>void;
 onOpen:(id:string)=>void; onBack:()=>void; onGeneratePlan:(project:ResearchProject,categories:string[])=>void;
 onApprove:(plan:ResearchPlan)=>void; onCancel:(task:ResearchTask)=>void;
 onRetry:(task:ResearchTask)=>void; onSync:(task:ResearchTask)=>void; onView:(task:ResearchTask)=>void; onAnalyze:(task:ResearchTask)=>void;
 analytics?:any; analyticsTaskId?:string; taskLogs?:Record<string,string[]>; onLoadLogs:(task:ResearchTask)=>void;
 onSaveAnalytics:()=>void; onGenerateReport:(projectId:string)=>void;
};
const stages=['研究需求','调研平台','数据抓取','数据统计','AI 分析报告'];
const statusLabel:Record<ResearchDimension['status'],string>={provided:'用户已提供',suggested:'AI 建议',needs_confirmation:'待补充确认',user_confirmed:'用户已确认'};
const statusType:Record<ResearchDimension['status'],'green'|'blue'|'warm-gray'>={provided:'green',suggested:'blue',needs_confirmation:'warm-gray',user_confirmed:'green'};
const dimensionGroups=[
 {title:'市场与地域',description:'确定研究覆盖的国家、地区和语言。',keys:['keywords','languages','countries','regions','time_range']},
 {title:'商品与品牌',description:'定义研究对象、产品范围和竞品边界。',keys:['product_categories','product_attributes','brands','models_identifiers','price_range','usage_scenarios','certifications']},
 {title:'商业与渠道',description:'描述客户、销售路径、供应链和研究范围。',keys:['target_customers','sales_channels','competitors','reference_urls','origin_supply_markets','logistics_attributes','exclusions']},
];
const sourceGroups=[
 {id:'ecommerce',title:'全球电商平台',desc:'商品目录、价格、商品排名与卖家信息',items:['Amazon','eBay','Walmart','AliExpress','Alibaba','Etsy']},
 {id:'social',title:'社交媒体',desc:'内容、互动、话题、创作者与趋势线索',items:['TikTok','Instagram','Facebook','YouTube','Reddit','Pinterest']},
 {id:'search',title:'搜索引擎与购物搜索',desc:'搜索结果、关键词、购物结果与网页线索',items:['Google','Bing','Google Shopping']},
 {id:'reviews',title:'商品评价与消费者反馈',desc:'星级、评论文本、问答与消费者痛点',items:['Amazon Reviews','Walmart Reviews','Reddit Discussions']},
 {id:'suppliers',title:'企业与供应商',desc:'企业目录、制造商、批发商与供应链线索',items:['Supplier Directories','Manufacturer Websites','Wholesale Directories']},
 {id:'ads',title:'广告与市场趋势',desc:'公开广告素材、热门内容与趋势信号',items:['Ad Libraries','Trend Keywords','Public Campaign Pages']},
 {id:'brands',title:'独立站与品牌官网',desc:'品牌官网、独立电商站与公开产品目录',items:['Shopify Stores','Brand Websites','Product Catalogues']},
 {id:'other',title:'其他行业数据',desc:'公开行业目录与可访问的垂直数据源',items:['Industry Directories','Public Trade Data','Logistics Information']},
];
const dropdownOptions:Record<string,string[]>={languages:['英语','德语','法语','西班牙语','意大利语','日语','韩语','中文','多语言 / 自动识别'],time_range:['近 30 天','近 90 天','近 6 个月','近 12 个月','近 24 个月','全部可用历史数据','自定义（在补充说明中填写）'],business_goals:['市场进入可行性','新品选品与产品开发','竞争对手分析','市场定价分析','消费者需求洞察','寻找供应商与制造商','销售渠道策略','品牌定位与营销策略','综合市场研究']};
const fieldSpecs=[
 ['keywords','核心关键词','例如：智能喂食器、自动猫砂盆'],
 ['countries','目标国家','例如：德国、法国、美国'],
 ['regions','目标地区 / 城市','例如：加州、巴伐利亚州'],
 ['languages','研究语言','例如：英语、德语、法语'],
 ['product_categories','产品类别','例如：宠物智能用品'],
 ['product_attributes','产品属性与规格','例如：容量、材质、尺寸、连接方式'],
 ['brands','品牌','例如：Petkit、PETLIBRO'],
 ['models_identifiers','型号 / SKU / UPC / EAN','可填写多个标识符'],
 ['price_range','价格范围与币种','例如：20–150 EUR'],
 ['time_range','研究时间范围','例如：近 12 个月'],
 ['target_customers','目标客户群体','例如：养猫家庭、宠物店'],
 ['sales_channels','销售渠道','例如：Amazon、独立站、线下零售'],
 ['competitors','竞争对手','填写品牌或企业名称'],
 ['reference_urls','参考 URL / 社交账号','可填写多个网址，每行一个'],
 ['origin_supply_markets','原产地 / 供应链市场','例如：中国、越南'],
 ['certifications','认证与合规要求','例如：CE、RoHS、FCC'],
 ['usage_scenarios','使用场景','例如：上班族、长时间离家'],
 ['logistics_attributes','包装与物流属性','例如：易碎、带电池、体积重量'],
 ['exclusions','排除条件','例如：排除二手商品、低评分商品'],
 ['purchase_requirements','采购数量与成本要求','例如：首单 500 件，目标 FOB 成本'],
 ['business_goals','商业目标与研究问题','例如：寻找新品机会、评估进入德国市场的可行性'],
 ['other_constraints','其他约束条件','填写其他必须遵守的研究限制'],
];
function ResearchAnalyticsView({data}:{data:any}) {
 const metrics=data?.metrics??{}, distributions=data?.distributions??{};
 const sections=[
  {title:'价格区间',items:distributions.price_bands??[],label:(x:any)=>x.label??'区间'},
  {title:'国家 / 地区分布',items:distributions.countries??[],label:(x:any)=>x.label??'地区'},
  {title:'品牌分布',items:distributions.brands??[],label:(x:any)=>x.label??'品牌'},
  {title:'商品类目分布',items:distributions.categories??[],label:(x:any)=>x.label??'类目'},
  {title:'评分分布',items:distributions.rating_distribution??[],label:(x:any)=>String(x.rating??'')+' 星'},
  {title:'消费者评价关键词',items:distributions.review_words??[],label:(x:any)=>x.label??'关键词'},
 ];
 return <div className="research-analytics-view">
  <div className="research-analytics-source"><b>统计覆盖</b><span>{Number(data?.coverage?.analyzed??0).toLocaleString()} / {Number(data?.coverage?.available??0).toLocaleString()} 条记录</span></div>
  <div className="research-analytics-kpis">{[['平均价格',metrics.average_price==null?'—':Number(metrics.average_price).toFixed(2)+' '+(metrics.price_currency??'')],['最低价格',metrics.min_price==null?'—':String(metrics.min_price)],['最高价格',metrics.max_price==null?'—':String(metrics.max_price)],['平均评分',metrics.average_rating==null?'—':Number(metrics.average_rating).toFixed(2)],['平均评价数',metrics.average_reviews==null?'—':Number(metrics.average_reviews).toFixed(1)],['价格样本',Number(metrics.price_count??0).toLocaleString()+' 条']].map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
  <div className="research-analytics-grid">{sections.map(section=><section className="research-analytics-panel" key={section.title}><h4>{section.title}</h4>{section.items.length?section.items.slice(0,10).map((item:any,index:number)=>{const count=Number(item.count??0);const max=Math.max(1,...section.items.map((x:any)=>Number(x.count??0)));return <div className="research-chart-row" key={index}><div><span>{section.label(item)}</span><b>{count.toLocaleString()}</b></div><div className="research-chart-track"><i style={{width:(count/max*100)+'%'}}/></div></div>}):<p className="research-empty-chart">来源未提供可识别字段，暂无可展示数据。</p>}</section>)}</div>
  <section className="research-analytics-panel"><h4>数据字段覆盖率</h4><div className="research-quality-grid">{Object.entries(data?.quality??{}).map(([key,value])=><div key={key}><span>{key.replace(/_rate$/,'').replaceAll('_',' ')}</span><b>{(Number(value)*100).toFixed(1)}%</b></div>)}</div></section>
 </div>;
}
function stageIndex(plan:ResearchPlan|undefined,tasks:ResearchTask[],reports:ResearchReport[]) {
 if(reports.some(report=>report.report_type==='market_research'))return 4;
 if(tasks.length>0&&tasks.every(task=>reports.some(report=>report.report_type==='dataset_analytics'&&report.evidence?.some(item=>item.task_id===task.id))))return 4;
 if(tasks.length&&tasks.every(t=>t.status==='succeeded'&&Number(t.result_synced_count??0)>=Number(t.result_count??0)))return 3;
 if(tasks.length)return 2;
 if(plan)return 1;
 return 0;
}
const splitValues=(value:string)=>value.split(/\n|,/).map(v=>v.trim()).filter(Boolean);
export function ResearchWizard(props:Props) {
 const {projects,plans,tasks,reports,projectId,busy,onParse,onCreate,onOpen,onBack,onGeneratePlan,onApprove,onCancel,onRetry,onSync,onView,onAnalyze,analytics,analyticsTaskId,taskLogs={},onLoadLogs,onSaveAnalytics,onGenerateReport}=props;
 const [brief,setBrief]=React.useState('');
 const [formValues,setFormValues]=React.useState<Record<string,string>>({});
 const [profile,setProfile]=React.useState<ResearchProfile|null>(null);
 const [parseError,setParseError]=React.useState('');
 const [customLabel,setCustomLabel]=React.useState('');
 const [customValue,setCustomValue]=React.useState('');
 const [activeStep,setActiveStep]=React.useState(0);
 const [selectedSources,setSelectedSources]=React.useState<string[]>([]);
 const project=projects.find(p=>p.id===projectId);
 const projectPlans=plans.filter(p=>p.project_id===projectId); const plan=projectPlans[0];
 const projectTasks=tasks.filter(t=>t.project_id===projectId); const projectReports=reports.filter(r=>r.project_id===projectId);
 const proposedTasks=Array.isArray(plan?.plan?.platform_tasks)?plan.plan.platform_tasks:[];
 const actorsReady=proposedTasks.length>0&&proposedTasks.every((task:any)=>typeof task.actor_id==='string'&&task.actor_id.trim().length>0&&task.schema_valid===true);
 const synced=projectTasks.reduce((sum,t)=>sum+Number(t.result_synced_count??0),0);
 const expected=projectTasks.reduce((sum,t)=>sum+Number(t.result_count??0),0);
 const allSynced=projectTasks.length>0&&projectTasks.every(t=>t.status==='succeeded'&&Number(t.result_synced_count??0)>=Number(t.result_count??0));
 React.useEffect(()=>{if(project){setActiveStep(stageIndex(plan,projectTasks,projectReports));const stored=project.scope?.selected_data_sources;if(Array.isArray(stored))setSelectedSources(stored as string[]);}else{setActiveStep(0);setSelectedSources([]);}},[projectId,plan?.id,projectTasks.length,projectReports.length]);
 const runningTaskKey=projectTasks.map(task=>task.id+':'+task.status+':'+String(task.external_run_id??'')).join('|');
 React.useEffect(()=>{
  if(!projectId||activeStep!==2||!projectTasks.some(task=>task.external_run_id))return;
  const poll=()=>projectTasks.filter(task=>task.external_run_id).forEach(onLoadLogs);
  poll();
  if(!projectTasks.some(task=>['queued','running'].includes(task.status)))return;
  const timer=window.setInterval(poll,8000);
  return ()=>window.clearInterval(timer);
 },[activeStep,projectId,runningTaskKey]);
 async function parseBrief(){
  const formBrief=fieldSpecs.map(([key,label])=>formValues[key]?.trim()?label+'：'+formValues[key].trim():'').filter(Boolean).join('\n');
  const combined=[formBrief,brief.trim()].filter(Boolean).join('\n\n补充说明：\n');
  if(!combined.trim())return;
  setParseError('');
  try{setProfile(await onParse(combined));}catch(error){setParseError(error instanceof Error?error.message:'AI 解析失败，请稍后重试。');}
 }
 function updateDimension(key:string,raw:string){if(!profile)return;const values=splitValues(raw);setProfile({...profile,dimensions:profile.dimensions.map(item=>item.key===key?{...item,values,status:values.length?'user_confirmed':'needs_confirmation'}:item)});}
 function addCustomDimension(){if(!profile||!customLabel.trim()||!customValue.trim())return;setProfile({...profile,dimensions:[...profile.dimensions,{key:'custom_'+Date.now(),label:customLabel.trim(),values:splitValues(customValue),status:'user_confirmed'}]});setCustomLabel('');setCustomValue('');}
 const confirmedCount=profile?.dimensions.filter(item=>item.status==='provided'||item.status==='user_confirmed').length??0;
 const suggestedCount=profile?.dimensions.filter(item=>item.status==='suggested').length??0;
 const missingCount=profile?.dimensions.filter(item=>item.status==='needs_confirmation').length??0;
 if(!project)return <section className="module-stack research-workspace research-fullwidth">
  <Tile className="research-start-tile">
   <p className="eyebrow">STEP 1 / RESEARCH SCOPE</p><h2>建立你的市场研究需求</h2>
   <p>按字段填写关键信息；不确定的项目可以留空。AI 会帮助整理、识别缺失项，并保留信息来源状态。</p>
   <div className="research-intake-grid">
    {fieldSpecs.map(([key,label,placeholder])=><div className="research-intake-field" key={key}>{dropdownOptions[key]?<><label className="research-select-label" htmlFor={'intake-'+key}>{label}</label><select id={'intake-'+key} className="research-select-control" value={formValues[key]??''} onChange={e=>{setFormValues(v=>({...v,[key]:e.target.value}));setProfile(null);}}><option value="">请选择（可留空）</option>{dropdownOptions[key].map(option=><option key={option} value={option}>{option}</option>)}</select></>:<TextInput id={'intake-'+key} labelText={label} value={formValues[key]??''} placeholder={placeholder} onChange={e=>{setFormValues(v=>({...v,[key]:e.target.value}));setProfile(null);}}/>}</div>)}
   </div>
   <div className="research-intake-field research-intake-wide"><TextArea id="research-brief" labelText="其他研究说明 / 自然语言补充" value={brief} onChange={e=>{setBrief(e.target.value);setProfile(null);}} rows={4} placeholder="例如：希望比较德国和法国市场的竞争强度，重点寻找差异化产品机会，并评估适合跨境电商的切入方式。"/></div>
   <div className="research-start-actions"><span>所有字段均可选；至少填写一个条件或补充说明即可开始。</span><Button kind="primary" renderIcon={Renew} disabled={(!brief.trim()&&!Object.values(formValues).some(v=>v.trim()))||busy} onClick={()=>void parseBrief()}>AI 整理研究需求</Button></div>
   {parseError&&<p className="error-text">{parseError}</p>}
  </Tile>
  {profile&&<Tile className="research-profile-tile">
   <div className="module-heading"><div><p className="eyebrow">AI STRUCTURED RESEARCH PROFILE</p><h2>检查并确认研究条件</h2><p>{profile.summary}</p></div><Tag type="green">解析完成</Tag></div>
   <div className="research-profile-stats"><Tag type="green">{confirmedCount} 项已明确</Tag><Tag type="blue">{suggestedCount} 项 AI 建议</Tag><Tag type="warm-gray">{missingCount} 项待补充</Tag></div>
   <p className="research-profile-hint">绿色是用户提供或确认的信息；蓝色是 AI 建议；灰色是待补充。修改为空的字段会重新标记为待补充。</p>
   {dimensionGroups.map(group=><div className="research-dimension-group" key={group.title}><div><h3>{group.title}</h3><p>{group.description}</p></div><div className="research-dimension-grid">
    {profile.dimensions.filter(item=>group.keys.includes(item.key)).map(item=><div className="research-dimension" key={item.key}><div className="research-dimension-heading"><b>{item.label}</b><Tag type={statusType[item.status]}>{statusLabel[item.status]}</Tag></div><TextArea id={'dimension-'+item.key} labelText={item.label} hideLabel rows={2} value={item.values.join('\n')} placeholder="未提供，可留空或补充" onChange={e=>updateDimension(item.key,e.target.value)}/>{item.note&&<small>{item.note}</small>}</div>)}
   </div></div>)}
   {profile.dimensions.some(item=>!dimensionGroups.some(group=>group.keys.includes(item.key)))&&<div className="research-dimension-group"><h3>其他补充维度</h3><div className="research-dimension-grid">{profile.dimensions.filter(item=>!dimensionGroups.some(group=>group.keys.includes(item.key))).map(item=><div className="research-dimension" key={item.key}><div className="research-dimension-heading"><b>{item.label}</b><Tag type={statusType[item.status]}>{statusLabel[item.status]}</Tag></div><TextArea id={'dimension-'+item.key} labelText={item.label} hideLabel rows={2} value={item.values.join('\n')} onChange={e=>updateDimension(item.key,e.target.value)}/></div>)}</div></div>}
   <div className="research-dimension-group"><h3>添加自定义研究维度</h3><div className="research-custom-dimension"><TextInput id="custom-dimension-label" labelText="维度名称" value={customLabel} onChange={e=>setCustomLabel(e.target.value)} placeholder="例如：认证要求"/><TextInput id="custom-dimension-value" labelText="维度内容" value={customValue} onChange={e=>setCustomValue(e.target.value)} placeholder="例如：CE、RoHS"/><Button kind="tertiary" renderIcon={Add} disabled={!customLabel.trim()||!customValue.trim()} onClick={addCustomDimension}>添加维度</Button></div></div>
   <div className="research-dimension-group"><h3>研究目标</h3><TextArea id="research-goals" labelText="研究目标" rows={3} value={profile.research_goals.join('\n')} onChange={e=>setProfile({...profile,research_goals:splitValues(e.target.value)})}/></div>
   {profile.assumptions.length>0&&<div className="research-profile-notes"><b>AI 推断与假设（请留意）</b>{profile.assumptions.map((item,index)=><p key={index}>{item}</p>)}</div>}
   {profile.missing_information.length>0&&<div className="research-profile-notes"><b>尚未明确的信息</b>{profile.missing_information.map((item,index)=><p key={index}>{item}</p>)}</div>}
   <div className="research-start-actions"><span>确认后创建研究项目，不会自动启动采集。</span><Button kind="primary" disabled={busy||!profile.dimensions.some(item=>item.values.length>0)} onClick={()=>onCreate([fieldSpecs.map(([key,label])=>formValues[key]?.trim()?label+'：'+formValues[key].trim():'').filter(Boolean).join('\n'),brief.trim()].filter(Boolean).join('\n\n'),profile)}>确认研究条件并创建项目 <ArrowRight size={16}/></Button></div>
  </Tile>}
  <div className="module-heading"><div><h2>我的研究项目</h2><p>每项研究都保留需求、采集、统计与报告记录。</p></div><Tag type="blue">{projects.length} 个项目</Tag></div>
  <div className="project-card-grid">{projects.map(item=><Tile key={item.id} className="list-tile"><div><h3>{item.name}</h3><p>{item.objective}</p><Tag type={item.status==='completed'?'green':'blue'}>{item.status}</Tag></div><Button kind="ghost" renderIcon={ArrowRight} onClick={()=>onOpen(item.id)}>打开研究工作区</Button></Tile>)}</div>
  {!projects.length&&<Tile><p>还没有研究项目。填写上方研究需求即可开始。</p></Tile>}
 </section>;

 const savedProfile=project.scope?.research_profile as ResearchProfile|undefined;
 const selectedPlanSources=selectedSources;
 const completedCount=projectTasks.filter(t=>t.status==='succeeded'&&Number(t.result_synced_count??0)>=Number(t.result_count??0)).length;
 const taskEvents=projectTasks.flatMap(task=>[
  {time:task.created_at,label:task.platform_slug+' 任务已创建',detail:'等待执行'},
  ...(task.started_at?[{time:task.started_at,label:task.platform_slug+' 开始运行',detail:task.run_status??'Apify Run'}]:[]),
  ...(task.finished_at?[{time:task.finished_at,label:task.platform_slug+' 运行结束',detail:task.status+(task.error_message?' · '+task.error_message:'')}]:[]),
  ...(Number(task.result_synced_count??0)>0?[{time:task.updated_at??task.finished_at??task.created_at,label:task.platform_slug+' 数据同步进度',detail:(task.result_synced_count??0)+' / '+(task.result_count??0)+' 条'}]:[]),
 ]).sort((a,b)=>new Date(b.time).getTime()-new Date(a.time).getTime()).slice(0,30);
 const statsSavedForAllTasks=projectTasks.length>0&&projectTasks.every(task=>projectReports.some(report=>report.report_type==='dataset_analytics'&&report.evidence?.some(item=>item.task_id===task.id)));
 const analyticsSavedForCurrentTask=Boolean(analyticsTaskId&&projectReports.some(report=>report.report_type==='dataset_analytics'&&report.evidence?.some(item=>item.task_id===analyticsTaskId)));
 const stepReady=[true,true,projectTasks.length>0,allSynced,statsSavedForAllTasks];
 const maxUnlockedStep=stepReady.reduce((max,ready,index)=>ready?index:max,-1);
 return <section className="module-stack research-workspace research-fullwidth">
  <div className="research-detail-heading"><Button kind="ghost" renderIcon={ArrowLeft} onClick={onBack}>全部研究</Button><div><p className="eyebrow">RESEARCH PROJECT WORKSPACE</p><h2>{project.name}</h2><p>{savedProfile?.summary??project.objective}</p></div><Tag type={project.status==='completed'?'green':'blue'}>{project.status}</Tag></div>
  <Tile className="research-progress-tile">
   <div className="module-heading"><div><h3>五步研究工作流</h3><p>每一步独立保存进度；可返回查看前序结果。只有批准采集计划后才会启动 Apify。</p></div><Tag type="blue">第 {activeStep+1} / 5 步</Tag></div>
   <div className="research-stepper">{stages.map((label,index)=><button type="button" key={label} className={'research-step research-step-button'+(index===activeStep?' is-current':'')+(stepReady[index]?' is-complete':'')} disabled={index>maxUnlockedStep} onClick={()=>setActiveStep(index)}><span>{stepReady[index]&&index!==activeStep?<CheckmarkFilled size={18}/>:index+1}</span><b>{label}</b></button>)}</div>
  </Tile>
  {activeStep===0&&<Tile><div className="module-heading"><div><h3>第一步 · 已确认的研究需求</h3><p>查看第一步保存的结构化画像。修改需求时应重新评估后续采集计划。</p></div><Tag type="green">已保存</Tag></div><p>{savedProfile?.summary??project.objective}</p>{savedProfile?.dimensions.filter(item=>item.values.length).map(item=><div className="research-saved-row" key={item.key}><b>{item.label} <Tag type={statusType[item.status]}>{statusLabel[item.status]}</Tag></b><p>{item.values.join(' · ')}</p></div>)}{!savedProfile&&<p>{project.objective}</p>}<Button kind="primary" onClick={()=>setActiveStep(1)}>下一步：选择调研平台 <ArrowRight size={16}/></Button></Tile>}
  {activeStep===1&&<Tile className="research-source-tile"><div className="module-heading"><div><p className="eyebrow">STEP 2 / DATA SOURCE MARKETPLACE</p><h3>选择调研平台与数据类别</h3><p>先选择需要覆盖的数据类别和具体平台。Synesis 将据此搜索 Apify Store 中真实存在且有输入 Schema 的 Actor。</p></div>{plan?<Tag type="green">平台方案已生成</Tag>:<Tag type="blue">待选择</Tag>}</div>
   <div className="research-source-grid">{sourceGroups.map(group=><div className="research-source-card" key={group.id}><label className="research-source-title"><input type="checkbox" checked={selectedPlanSources.includes(group.id)} onChange={e=>setSelectedSources(v=>e.target.checked?[...v,group.id]:v.filter(x=>x!==group.id))}/><span><b>{group.title}</b><small>{group.desc}</small></span></label><div className="research-source-items">{group.items.map(item=><label key={item}><input type="checkbox" checked={selectedPlanSources.includes(item)} onChange={e=>setSelectedSources(v=>e.target.checked?[...v,item]:v.filter(x=>x!==item))}/>{item}</label>)}</div></div>)}</div>
   {plan&&<><div className="research-actor-candidates"><h4>Apify Store 发现的候选 Actor</h4>{(Array.isArray(plan.plan.actor_candidates)?plan.plan.actor_candidates:[]).map((actor:any,index:number)=><div className="research-actor-card" key={String(actor.id??index)}><div><b>{String(actor.title??actor.name??actor.id??'Apify Actor')}</b><p>{String(actor.description??'暂无描述')}</p><small>{Array.isArray(actor.categories)?actor.categories.join(' · '):'Apify Store 候选'} · {String(actor.pricing_model??'计费方式未提供')}{actor.rating?' · 评分 '+actor.rating:''}</small></div></div>)}</div><div className="research-plan-meta"><span>发现候选 Actor：{Array.isArray(plan.plan.actor_candidates)?plan.plan.actor_candidates.length:0}</span><span>拟执行任务：{proposedTasks.length}</span><span>预计费用（AI 估算）：{plan.estimated_cost===null?'暂不可估算':'$ '+Number(plan.estimated_cost).toFixed(2)}</span></div><p>{String(plan.plan.executive_summary??'AI 已生成调研平台方案。')}</p><div className="research-plan-list">{proposedTasks.map((task:any,index:number)=><div className="research-plan-row" key={index}><div><b>{String(task.platform_slug??'平台')} · {String(task.actor_title??'待选择 Actor')}</b><p>{String(task.purpose??task.description??'按研究目标采集')}</p><p>预计记录：{task.estimated_items??'未估算'} · 计费：{String(task.pricing_model??'未提供')}{task.actor_rating?' · 评分 '+task.actor_rating:''}</p>{task.schema_valid?<Tag type="green">输入参数已校验</Tag>:<Tag type="warm-gray">参数待调整</Tag>}{(task.validation_errors??[]).map((error:string)=><p key={error}>{error}</p>)}</div></div>)}</div><div className="research-start-actions"><span>可以修改上方平台勾选，再按当前选择重新搜索候选 Actor。</span><Button kind="tertiary" disabled={!selectedPlanSources.length||busy} onClick={()=>onGeneratePlan(project,selectedPlanSources)}>按当前选择重新生成方案</Button></div><div className="research-approval"><p>{actorsReady?'所有拟执行任务均已匹配真实 Apify Actor，并通过输入 Schema 校验。批准后将开始抓取。':'部分任务未找到可执行的真实 Actor 或未通过 Schema 校验，不能批准执行。可调整平台选择后重新生成。'}</p><Button kind="primary" disabled={!actorsReady||busy||plan.status!=='pending_approval'} onClick={()=>onApprove(plan)}>确认平台方案并开始抓取</Button></div></>}
   {!plan&&<div className="research-start-actions"><span>选择一个或多个分类 / 平台。实际 Actor 以 Apify Store 搜索结果为准。</span><Button kind="primary" disabled={!selectedPlanSources.length||busy} onClick={()=>onGeneratePlan(project,selectedPlanSources)}>搜索 Apify 平台并生成方案 <ArrowRight size={16}/></Button></div>}
  </Tile>}
  {activeStep===2&&<Tile><div className="module-heading"><div><p className="eyebrow">STEP 3 / COLLECTION MONITOR</p><h3>数据抓取与动态运行状态</h3><p>状态每 12 秒自动刷新；Apify Run 完成后继续同步 Dataset，直至所有结果写入数据库。</p></div><Tag type={allSynced?'green':'blue'}>{allSynced?'全部同步完成':'采集进行中'}</Tag></div>
   <div className="research-run-kpis"><div><strong>{projectTasks.length}</strong><span>采集任务</span></div><div><strong>{completedCount}</strong><span>同步完成</span></div><div><strong>{synced.toLocaleString()}</strong><span>已同步记录</span></div><div><strong>{expected.toLocaleString()}</strong><span>预期记录</span></div></div>
   {projectTasks.map(task=><div className="research-task-row" key={task.id}><div><b>{task.platform_slug}</b><p>{task.status} · Apify {task.run_status??'等待运行'} · {Number(task.result_synced_count??0).toLocaleString()} / {Number(task.result_count??0).toLocaleString()}</p>{task.error_message&&<p className="error-text">{task.error_message}</p>}{task.external_run_id&&<div className="research-live-log"><div><b>Apify 实时运行日志</b><Button size="sm" kind="ghost" onClick={()=>onLoadLogs(task)}>刷新日志</Button></div><pre>{(taskLogs[task.id]??[]).join('\n')||'正在等待 Apify 输出日志…'}</pre></div>}</div><div className="card-actions">{task.status==='failed'&&<Button size="sm" kind="tertiary" renderIcon={Renew} onClick={()=>onRetry(task)}>重试</Button>}{(['queued','running'].includes(task.status)||(task.status==='succeeded'&&Number(task.result_synced_count??0)<Number(task.result_count??0)))&&<Button size="sm" kind="ghost" renderIcon={Renew} onClick={()=>onSync(task)}>同步 / 刷新</Button>}{['queued','running'].includes(task.status)&&<Button size="sm" kind="danger--tertiary" onClick={()=>onCancel(task)}>取消</Button>}{task.status==='succeeded'&&<Button size="sm" kind="ghost" onClick={()=>onView(task)}>查看结果</Button>}</div></div>)}
   <div className="research-dimension-group"><h4>动态运行事件</h4>{taskEvents.length?taskEvents.map((event,index)=><div className="research-event-row" key={index}><time>{new Date(event.time).toLocaleString()}</time><b>{event.label}</b><span>{event.detail}</span></div>):<p className="research-profile-hint">尚无采集事件。完成第二步平台选择并批准后，运行状态将在这里显示。</p>}</div>
   {allSynced&&<Button kind="primary" onClick={()=>setActiveStep(3)}>数据已同步，进入统计分析 <ArrowRight size={16}/></Button>}
  </Tile>}
  {activeStep===3&&<Tile><div className="module-heading"><div><p className="eyebrow">STEP 4 / BUSINESS INTELLIGENCE</p><h3>数据统计与多维可视化</h3><p>选择已完成同步的采集任务，生成价格、品牌、类目、评价字段和关键词统计。</p></div><Tag type={allSynced?'green':'warm-gray'}>{allSynced?'数据已就绪':'等待数据完整同步'}</Tag></div>
   {projectTasks.map(task=><div className="research-task-row" key={task.id}><div><b>{task.platform_slug}</b><p>{Number(task.result_synced_count??0).toLocaleString()} / {Number(task.result_count??0).toLocaleString()} 条已同步</p></div><Button size="sm" kind="tertiary" renderIcon={ChartLine} disabled={busy||task.status!=='succeeded'||Number(task.result_synced_count??0)<Number(task.result_count??0)} onClick={()=>onAnalyze(task)}>生成该数据源统计</Button></div>)}
   {analytics&&analyticsTaskId&&projectTasks.some(task=>task.id===analyticsTaskId)&&<ResearchAnalyticsView data={analytics}/>}{analytics&&analyticsTaskId&&projectTasks.some(task=>task.id===analyticsTaskId)&&<div className="research-analytics-save"><span>{analyticsSavedForCurrentTask?"该数据源统计快照已保存。":"保存该数据源的统计快照后，才能进入第五步。"}</span><Button kind="primary" disabled={busy||analyticsSavedForCurrentTask} onClick={onSaveAnalytics}>保存统计快照</Button></div>}
   <p className="research-profile-hint">统计图表只展示数据源真实提供且可识别的字段。国家分布、评价词云、评分分布和价格区间均以实际返回字段为依据；缺少字段时会明确显示暂无可用数据。</p>
   {!projectTasks.length&&<p>尚无采集结果，请先完成第二、三步。</p>}
  </Tile>}
  {activeStep===4&&<Tile><div className="module-heading"><div><p className="eyebrow">STEP 5 / AI STRATEGY & REPORT</p><h3>AI 深度分析与商业策略报告</h3><p>基于已同步数据和统计结果，形成可追溯的市场研究报告。</p></div><Tag type={projectReports.length?'green':'blue'}>{projectReports.length?'报告已保存':'等待分析'}</Tag></div>
   <div className="research-report-topics"><span>产品开发策略</span><span>定价策略</span><span>目标市场策略</span><span>消费者人群策略</span><span>竞争策略</span><span>营销与渠道策略</span><span>风险与行动计划</span></div>
   {projectReports.map(report=><div className="research-saved-report" key={report.id}><div className="report-row"><div><strong>{report.title}</strong><p>{new Date(report.created_at).toLocaleString()} · {report.status}</p></div><Tag type="green">已保存</Tag></div><details><summary>查看报告内容</summary><pre className="result-json">{JSON.stringify(report.content,null,2)}</pre></details></div>)}
   {!projectReports.some(report=>report.report_type==="market_research")&&<div className="research-ai-report-action"><p>{statsSavedForAllTasks?"第五步已就绪。AI 将综合全部采集数据与第四步保存的统计快照，生成产品、定价、市场、人群、竞争和营销策略。":"请先在第四步为每个采集任务生成并保存统计快照。完成后即可启动 AI 深度分析。"}</p><Button kind="primary" disabled={busy||!statsSavedForAllTasks} onClick={()=>onGenerateReport(project.id)}>开始 AI 深度分析并保存报告方案</Button></div>}
  </Tile>}
  <div className="research-step-footer"><Button kind="ghost" disabled={activeStep===0} onClick={()=>setActiveStep(v=>Math.max(0,v-1))}>上一步</Button><Button kind="secondary" disabled={activeStep===4||!stepReady[activeStep+1]} onClick={()=>setActiveStep(v=>Math.min(4,v+1))}>下一步 <ArrowRight size={16}/></Button></div>
 </section>;
}
