import { useState } from 'react';
import { DynamicActorForm } from './DynamicActorForm';
import { MultiSelect, countryOptions, languageOptions } from './MultiSelect';

type Props={onApi:(action:string,payload?:Record<string,unknown>)=>Promise<any>};
type Platform={id:string;label:string;group:string;logo:string;logoColor:string};
type Actor={actor_id:string;title:string;description?:string;score?:number;platform:string;recommendation_reason?:string;input_schema?:any;stats?:any};
const platforms:Platform[]=[
 {id:'instagram',label:'Instagram',group:'主流社交',logo:'instagram',logoColor:'#E4405F'},
 {id:'tiktok',label:'TikTok',group:'主流社交',logo:'tiktok',logoColor:'#111111'},
 {id:'youtube',label:'YouTube',group:'主流社交',logo:'youtube',logoColor:'#FF0033'},
 {id:'facebook',label:'Facebook',group:'主流社交',logo:'facebook',logoColor:'#0866FF'},
 {id:'linkedin',label:'LinkedIn',group:'B2B 专业网络',logo:'linkedin',logoColor:'#0A66C2'},
 {id:'x',label:'X / Twitter',group:'主流社交',logo:'x',logoColor:'#111111'},
 {id:'reddit',label:'Reddit',group:'社区与讨论',logo:'reddit',logoColor:'#FF4500'},
 {id:'pinterest',label:'Pinterest',group:'视觉与灵感',logo:'pinterest',logoColor:'#BD081C'},
 {id:'threads',label:'Threads',group:'主流社交',logo:'threads',logoColor:'#111111'},
 {id:'telegram',label:'Telegram',group:'社群平台',logo:'telegram',logoColor:'#26A5E4'},
 {id:'discord',label:'Discord',group:'社群平台',logo:'discord',logoColor:'#5865F2'},
 {id:'twitch',label:'Twitch',group:'直播与创作者',logo:'twitch',logoColor:'#9146FF'},
 {id:'medium',label:'Medium',group:'内容社区',logo:'medium',logoColor:'#111111'},
 {id:'quora',label:'Quora',group:'问答社区',logo:'quora',logoColor:'#B92B27'},
 {id:'snapchat',label:'Snapchat',group:'视觉与社交',logo:'snapchat',logoColor:'#FFFC00'}
];
const defaults:string[]=[];
const intents=[
 {id:'both',label:'买家 + 企业客户（AI 自动识别）'},
 {id:'buyer_intent',label:'寻找供应商 / 产品采购'},

 {id:'recommendation',label:'询问推荐 / 求购建议'},
 {id:'pain_point',label:'表达需求 / 痛点 / 问题'},
 {id:'competitor',label:'竞品用户与品牌讨论'},
 {id:'business',label:'企业 / 批发商 / 分销商发现'},
 {id:'creator',label:'创作者 / KOL / 合作伙伴发现'},
];
function schemaDefaults(schema:any){
 const values:Record<string,unknown>={};
 for(const [key,definition] of Object.entries<any>(schema?.properties??{})){
  if(definition.default!==undefined)values[key]=definition.default;
  else if(definition.type==='boolean')values[key]=false;
  else if(definition.type==='array')values[key]=[];
  else if(definition.type==='object')values[key]={};
  else if(definition.enum?.length)values[key]=definition.enum[0];
 }
 return values;
}
function postText(item:any){
 return String(item.text??item.postText??item.caption??item.description??item.title??item.content??item.message??item.body??'').trim();
}
function authorName(item:any){
 const author=item.author??item.owner??item.user??item.channel??item.profile??{};
 return String(item.authorName??item.ownerUsername??item.username??item.handle??author.name??author.username??author.handle??author.title??'未知作者');
}
function postUrl(item:any){
 return String(item.url??item.postUrl??item.webUrl??item.link??item.permalink??'');
}
function metric(item:any,...keys:string[]){
 for(const key of keys){const value=key.split('.').reduce((v:any,k)=>v?.[k],item);if(value!==undefined&&value!==null)return value;}
 return undefined;
}
export function SocialLeadsFinder({onApi}:Props){
 const [selectedPlatforms,setSelectedPlatforms]=useState<string[]>(defaults);
 const [intent,setIntent]=useState('both');
 const [customerScope,setCustomerScope]=useState<'both'|'company'|'person'>('both');
 const [projectId,setProjectId]=useState('');
 const [taskId,setTaskId]=useState('');
 const [storedStats,setStoredStats]=useState<{records:number;leads:number}|null>(null);
 const [keywords,setKeywords]=useState('');
 const [productOrService,setProductOrService]=useState('');
 const [targetCountries,setTargetCountries]=useState('');
 const [language,setLanguage]=useState('');
 const [includeTerms,setIncludeTerms]=useState('');
 const [excludeTerms,setExcludeTerms]=useState('');
 const [maxResults,setMaxResults]=useState('100');
 const [actors,setActors]=useState<Actor[]>([]);
 const [selected,setSelected]=useState<Actor|null>(null);
 const [schemaError,setSchemaError]=useState('');
 const [schemaLoading,setSchemaLoading]=useState(false);
 const [actorValues,setActorValues]=useState<Record<string,unknown>>({});
 const [actorInput,setActorInput]=useState('{}');
 const [rawJsonMode,setRawJsonMode]=useState(false);
 const [run,setRun]=useState<any>(null);
 const [results,setResults]=useState<any[]>([]);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [searchErrors,setSearchErrors]=useState<any[]>([]);
 const [tab,setTab]=useState<'criteria'|'actors'|'results'|'tasks'>('criteria');
 const [tasks,setTasks]=useState<any[]>([]);
 const togglePlatform=(id:string)=>setSelectedPlatforms(current=>current.includes(id)?current.filter(item=>item!==id):[...current,id]);
 async function loadSchema(actor:Actor){
  setSelected({...actor,input_schema:null});setSchemaLoading(true);setSchemaError('');setRawJsonMode(false);setError('');
  try{
   const response=await onApi('leads.actor.schema',{actorId:actor.actor_id});
   if(!response?.schema)throw new Error(response?.error??'该 Actor 未提供可读取的 Input Schema');
   const values=schemaDefaults(response.schema);
   setSelected({...actor,input_schema:response.schema});
   setActorValues(values);setActorInput(JSON.stringify(values,null,2));
  }catch(e){
   const message=e instanceof Error?e.message:'读取 Actor Input Schema 失败';
   setSchemaError(message);setSelected({...actor,input_schema:null});setActorValues({});setActorInput('{}');
  }finally{setSchemaLoading(false);}
 }
 async function recommend(){
  setBusy(true);setError('');setSearchErrors([]);setRun(null);setResults([]);
  try{
   const response=await onApi('social.actors.recommend',{criteria:{platforms:selectedPlatforms,intent,keywords,productOrService,targetCountries,language,includeTerms,excludeTerms,maxResults}});
   const list=(response.actors??[]) as Actor[];
   setActors(list);setSearchErrors(response.search_errors??[]);setSelected(null);setProjectId('');setTaskId('');setStoredStats(null);setActorValues({});setActorInput('{}');
   setTab('actors');
   if(!list.length){
    const failures=(response.search_errors??[]).length;
    if(failures)throw new Error('Apify Store 搜索请求有 '+failures+' 项失败。请查看下方平台级错误详情；如果没有错误但结果为 0，说明当前关键词未匹配到可用 Actor，可缩短关键词或换用平台通用词。');
    setError('Apify Store 已正常响应，但当前关键词没有匹配到可用 Actor。请缩短关键词或尝试平台通用词。');
   }
  }catch(e){setError(e instanceof Error?e.message:'社媒 Actor 推荐失败');}
  finally{setBusy(false);}
 }
 function updateValues(next:Record<string,unknown>){setActorValues(next);setActorInput(JSON.stringify(next,null,2));}
 async function startRun(){
  if(!selected)return;
  let input:unknown=actorValues;
  if(rawJsonMode){try{input=JSON.parse(actorInput);}catch{setError('Actor Input 必须是有效 JSON。');return;}}
  if(!input||typeof input!=='object'||Array.isArray(input)){setError('Actor Input 必须是 JSON 对象。');return;}
  setBusy(true);setError('');
  try{
   let activeProjectId=projectId;
   if(!activeProjectId){
    const project=await onApi('social.project.create',{platforms:selectedPlatforms,criteria:{intent,customerScope,identityMode:'ai_auto',keywords,productOrService,targetCountries,language,includeTerms,excludeTerms,maxResults},title:(productOrService||keywords||'社媒客户发现').slice(0,140)});
    activeProjectId=String(project.project.id);setProjectId(activeProjectId);
   }
   const response=await onApi('social.run',{projectId:activeProjectId,actorId:selected.actor_id,actorTitle:selected.title,input,platform:selected.platform,criteria:{intent,customerScope,identityMode:'ai_auto',keywords,productOrService}});
   setTaskId(String(response.task_id));setRun(response.run);setResults([]);setStoredStats(null);setTab('results');
  }catch(e){setError(e instanceof Error?e.message:'启动社媒采集失败');}
  finally{setBusy(false);}
 }
 async function refreshResults(){
  if(!run?.id||!taskId)return;setBusy(true);setError('');
  try{const response=await onApi('social.results',{taskId,runId:run.id});setRun(response.run);setResults(response.items??[]);setStoredStats({records:Number(response.stored_records??0),leads:Number(response.global_leads_touched??0)});}
  catch(e){setError(e instanceof Error?e.message:'读取采集结果失败');}
  finally{setBusy(false);}
 }
 async function loadTasks(){
  setBusy(true);setError('');
  try{const response=await onApi('social.tasks.list');setTasks(response.tasks??[]);setTab('tasks');}
  catch(e){setError(e instanceof Error?e.message:'加载社媒采集任务失败');}
  finally{setBusy(false);}
 }
 return <section className="leads-finder social-leads-finder">
  <div className="leads-intro"><div><span className="leads-eyebrow">GLOBAL CUSTOMER DISCOVERY / SOCIAL INTELLIGENCE</span></div><div className="leads-intro-stat"><strong>{actors.length||'—'}</strong><span>匹配采集工具</span></div></div>
  <div className="leads-stepper" aria-label="社媒客户发现流程"><button className={tab==='criteria'?'active':''} onClick={()=>setTab('criteria')}>01 搜索策略</button><i/><button className={tab==='actors'?'active':''} onClick={()=>setTab('actors')} disabled={!actors.length}>02 Actor 与参数</button><i/><button className={tab==='results'?'active':''} onClick={()=>setTab('results')} disabled={!run}>03 采集结果</button><i/><button className={tab==='tasks'?'active':''} onClick={()=>void loadTasks()}>04 任务记录</button></div>
  {error&&<div className="leads-error social-leads-error" role="alert"><span>{error}</span><button type="button" aria-label="关闭错误提示" onClick={()=>setError("")}>关闭</button></div>}
  {tab==='criteria'&&<div className="leads-layout">
   <div className="leads-form-main">
    <section className="leads-panel"><div className="leads-panel-head"><div><span>01 / PLATFORM COVERAGE</span><h3>选择社交平台</h3><p>请手动勾选本次要采集的平台。系统只检索你选中的平台，不会自动替你启动任何 Actor。</p></div></div>
     <MultiSelect label="社交平台" value={selectedPlatforms} options={platforms.map(item=>({value:item.id,label:item.label,group:item.group,logo:item.logo,logoColor:item.logoColor}))} onChange={setSelectedPlatforms} placeholder="搜索并选择社交平台…" />
     <div className="leads-schema-warning">平台覆盖取决于 Apify Store 当前可用的公开 Actor。登录限制、地区限制、平台政策、Actor 维护状态及付费规则均可能影响采集能力；不会绕过私密内容或访问控制。</div>
    </section>
    <section className="leads-panel"><div className="leads-panel-head"><div><span>02 / BUYING SIGNALS</span><h3>潜在客户发现策略</h3><p>从用户公开表达的需求和商业行为识别购买意向，而不是只抓取热门账号。</p></div></div>
     <div className="leads-field-grid">
      <label className="leads-field wide"><span>核心发现目的</span><select value={intent} onChange={e=>setIntent(e.target.value)}>{intents.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <label className="leads-field"><span>客户范围</span><select value={customerScope} onChange={e=>setCustomerScope(e.target.value as 'both'|'company'|'person')}><option value="both">企业 + 个人，AI 自动识别</option><option value="company">只寻找企业客户</option><option value="person">只寻找个人客户</option></select></label>
      <label className="leads-field wide"><span>行业 / 客户 / 需求关键词 <b>*</b></span><textarea rows={3} value={keywords} onChange={e=>setKeywords(e.target.value)} placeholder="例如：importer, wholesale buyer, looking for supplier, bulk order, sourcing agent"/></label>
      <label className="leads-field wide"><span>产品或服务</span><input value={productOrService} onChange={e=>setProductOrService(e.target.value)} placeholder="例如：stainless steel bottles, packaging machinery, OEM cosmetics"/></label>
      <div className="leads-field"><MultiSelect label="目标国家 / 地区" value={targetCountries?targetCountries.split(',').map(item=>item.trim()).filter(Boolean):[]} options={countryOptions} onChange={items=>setTargetCountries(items.join(', '))} placeholder="搜索国家并多选…" /></div>
      <div className="leads-field"><MultiSelect label="内容语言" value={language?language.split(',').map(item=>item.trim()).filter(Boolean):[]} options={languageOptions} onChange={items=>setLanguage(items.join(', '))} placeholder="搜索语言并多选…" /></div>
      <label className="leads-field wide"><span>必须包含的词语</span><input value={includeTerms} onChange={e=>setIncludeTerms(e.target.value)} placeholder="looking for, recommend, supplier, wholesale"/></label>
      <label className="leads-field wide"><span>排除词语</span><input value={excludeTerms} onChange={e=>setExcludeTerms(e.target.value)} placeholder="job, giveaway, spam, free sample"/></label>
      <label className="leads-field"><span>每个 Actor 目标结果数</span><input type="number" min="1" max="1000" value={maxResults} onChange={e=>setMaxResults(e.target.value)}/></label>
     </div>
    </section>
   </div>
   <aside className="leads-side"><div className="leads-panel leads-side-card"><span className="leads-side-kicker">SOCIAL BUYING INTENT</span><h3>识别真正有价值的线索</h3><ul><li>优先发现主动询问供应商、产品、报价和采购建议的公开内容。</li><li>通过评论、讨论和用户资料补充行业、地区与商业背景。</li><li>区分企业买家、消费者、创作者和普通互动用户。</li><li>不同平台数据结构不同，先读取 Actor Schema，再决定可执行的参数。</li></ul><div className="leads-side-note">社媒公开数据不等于已验证客户。系统不会将未公开邮箱、电话或私人身份信息当作可获取字段。</div></div><button className="leads-primary" disabled={busy||!selectedPlatforms.length||(!keywords.trim()&&!productOrService.trim())} onClick={()=>void recommend()}>{busy?'正在搜索各平台 Actor…':'发现社媒采集工具'} <span>→</span></button><p className="leads-muted">已选择 {selectedPlatforms.length} 个平台。Actor 的费用和访问限制由 Apify 平台及其开发者决定。</p></aside>
  </div>}
  {tab==='actors'&&<div className="leads-actor-workspace">
   <div className="leads-actor-list"><div className="leads-panel-head"><div><span>APIFY STORE DISCOVERY</span><h3>平台采集工具</h3><p>从 Apify Store 检索匹配工具。请由你手动选择具体 Actor，系统不会默认选择第一个结果。</p></div></div>
    {actors.length===0&&<div className="leads-schema-warning"><b>没有找到匹配的 Actor</b><p>已查询：{selectedPlatforms.map(id=>platforms.find(item=>item.id===id)?.label??id).join('、')}</p>{searchErrors.length===0?<p>Apify Store 没有返回 API 错误，但当前搜索条件下没有匹配工具。请缩短关键词或使用平台通用词。</p>:searchErrors.slice(0,10).map((item,i)=><p key={i}>{item.platform?.toUpperCase()} · HTTP {item.status??'网络错误'} · {item.query||'Store search'}：{item.error}</p>)}</div>}
    {actors.map(actor=><button key={actor.actor_id} className={'leads-actor-card'+(selected?.actor_id===actor.actor_id?' selected':'')} onClick={()=>void loadSchema(actor)}><span className="leads-actor-score">{Math.round(actor.score??0)}<small>匹配参考</small></span><span className="leads-actor-copy"><b>{actor.title}</b><small>{actor.platform?.toUpperCase()} · {actor.actor_id}</small><span>{actor.description||actor.recommendation_reason||'Apify Store Actor'}</span><small>近 30 日用户：{actor.stats?.totalUsers30Days??'未提供'}</small></span><span className="leads-radio">{selected?.actor_id===actor.actor_id?'✓':''}</span></button>)}
    {searchErrors.length>0&&<div className="leads-schema-warning">{searchErrors.length} 项平台搜索返回错误；其他平台结果仍可使用。{searchErrors.slice(0,10).map((item,i)=><div key={i}>{item.platform} · HTTP {item.status??'网络错误'} · {item.query||'Store search'}：{item.error}</div>)}</div>}
    <button className="leads-back-link" onClick={()=>setTab('criteria')}>← 返回修改搜索策略</button>
   </div>
   <div className="leads-panel leads-schema-panel">
    {selected?<><div className="leads-panel-head"><div><span>LIVE ACTOR INPUT SCHEMA</span><h3>{selected.title}</h3><p>{selected.actor_id} · {selected.platform?.toUpperCase()}</p></div></div>
     {schemaLoading?<div className="leads-empty">正在读取 Actor 当前构建的 Input Schema…</div>:<>
      {schemaError&&<div className="leads-error" role="alert">{schemaError}</div>}
      {!rawJsonMode&&<DynamicActorForm schema={selected.input_schema} schemaError={schemaError} value={actorValues} onChange={updateValues}/>}
      <div className="actor-json-tools"><button type="button" className="leads-back-link" onClick={()=>{if(!rawJsonMode)setActorInput(JSON.stringify(actorValues,null,2));setRawJsonMode(v=>!v);}}>{rawJsonMode?'返回动态表单':'高级模式：编辑原始 JSON'}</button><span>服务端启动前会再次校验 Actor Schema</span></div>
      {rawJsonMode&&<label className="leads-field leads-json-field"><span>Actor Input JSON</span><textarea rows={14} spellCheck={false} value={actorInput} onChange={e=>setActorInput(e.target.value)}/></label>}
      <button className="leads-primary" disabled={busy||schemaLoading||(!selected.input_schema&&!rawJsonMode)} onClick={()=>void startRun()}>{busy?'正在启动 Apify…':'确认参数并启动采集'} <span>→</span></button>
     </>}
    </>:<div className="leads-empty">请先在左侧手动选择一个 Actor。选择后才会读取该 Actor 的真实 Input Schema。</div>}
   </div>
  </div>}
  {tab==='results'&&<section className="leads-panel"><div className="leads-panel-head"><div><span>SOCIAL DATASET</span><h3>社媒发现结果</h3><p>{selected?.title} · Run {run?.id??'—'} · 状态 {run?.status??'—'} · 任务 {taskId||'—'}</p></div><button className="leads-secondary" onClick={()=>void refreshResults()} disabled={busy}>刷新并同步客户</button></div>
   {storedStats&&<div className="leads-schema-warning">已保存 {storedStats.records} 条原始记录；本次识别并关联 {storedStats.leads} 条客户线索。重复客户会合并，来源证据保留。</div>}
   {run?.status!=='SUCCEEDED'&&<div className="leads-schema-warning">采集任务尚未成功结束。可刷新状态；只有 Actor 成功后才会读取完整 Dataset。</div>}
   {results.length===0?<div className="leads-empty">目前没有可显示的结果。任务可能仍在运行，或 Actor 返回空 Dataset。</div>:<div className="social-result-list">{results.map((item,index)=>{const text=postText(item);const url=postUrl(item);const author=authorName(item);const likes=metric(item,'likes','likeCount','diggCount','stats.likes','engagement.likeCount');const comments=metric(item,'comments','commentCount','replyCount','stats.comments');const date=metric(item,'timestamp','createdAt','publishedAt','date');return <article className="social-result-card" key={String(item.id??item.postId??item.videoId??index)}><div className="social-result-meta"><b>{author}</b><span>{date?String(date):selected?.platform}</span></div>{text&&<p>{text}</p>}<div className="social-result-metrics">{likes!==undefined&&<span>♥ {String(likes)}</span>}{comments!==undefined&&<span>评论 {String(comments)}</span>}{item.views!==undefined&&<span>浏览 {String(item.views)}</span>}{url&&<a href={url} target="_blank" rel="noreferrer">查看原帖 ↗</a>}</div><details><summary>查看原始数据</summary><pre>{JSON.stringify(item,null,2)}</pre></details></article>;})}</div>}
  </section>}
  {tab==='tasks'&&<section className="leads-panel"><div className="leads-panel-head"><div><span>SOCIAL COLLECTION HISTORY</span><h3>社媒采集任务</h3><p>每个任务对应用户手动选择的平台与 Actor。运行状态、Dataset 和结果数量均独立记录。</p></div><button className="leads-secondary" onClick={()=>void loadTasks()} disabled={busy}>刷新任务</button></div>
   {tasks.length===0?<div className="leads-empty">暂无社媒采集任务。完成一次 Actor 启动后，任务会记录在这里。</div>:<div className="social-result-list">{tasks.map(task=><article className="social-result-card" key={task.id}><div className="social-result-meta"><b>{task.actor_title||task.actor_id}</b><span>{task.platform_slug?.toUpperCase()} · {task.status}</span></div><p>任务 ID：{task.id}</p><div className="social-result-metrics"><span>Run：{task.external_run_id||'尚未启动'}</span><span>结果：{task.result_count??0}</span><span>创建：{task.created_at?new Date(task.created_at).toLocaleString():'—'}</span></div>{task.error_message&&<div className="leads-error">{task.error_message}</div>}</article>)}</div>}
  </section>}
 </section>;
}
