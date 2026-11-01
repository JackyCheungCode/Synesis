import { useMemo, useState } from 'react';

type Criteria = {
  productKeywords: string; hsCodes: string; targetCountries: string; originCountries: string;
  companyTypes: string; industries: string; shipmentDateFrom: string; shipmentDateTo: string;
  minShipments: string; minImportValue: string; maxImportValue: string; activeRecently: string;
  requireEmail: boolean; requirePhone: boolean; requireWebsite: boolean; requireLinkedin: boolean;
  decisionMakerTitles: string; maxResults: string; notes: string;
};
type Actor = { actor_id: string; title: string; description?: string; score?: number; recommendation_reason?: string; input_schema?: any; stats?: any; supported_fields?: string[]; unsupported_fields?: string[] };
type Props = { onApi: (action: string, payload?: Record<string, unknown>) => Promise<any> };
const initial: Criteria = {
  productKeywords:'',hsCodes:'',targetCountries:'United States',originCountries:'',companyTypes:'Importer, Distributor, Wholesaler',
  industries:'',shipmentDateFrom:'',shipmentDateTo:'',minShipments:'',minImportValue:'',maxImportValue:'',activeRecently:'12',
  requireEmail:true,requirePhone:false,requireWebsite:true,requireLinkedin:false,decisionMakerTitles:'Purchasing Manager, Procurement Manager, Import Manager, Buyer',
  maxResults:'100',notes:'',
};
const split = (v:string) => v.split(/[，,;；\\n]+/).map(x=>x.trim()).filter(Boolean);
function toActorInput(actor:Actor, c:Criteria):Record<string,unknown>{
 const props=actor.input_schema?.properties??{};
 const input:Record<string,unknown>={};
 const values:Record<string,unknown>={
  productKeywords:split(c.productKeywords),keywords:split(c.productKeywords),searchQuery:[...split(c.productKeywords),...split(c.hsCodes)].join(' '),
  hsCodes:split(c.hsCodes),hs_codes:split(c.hsCodes),country:split(c.targetCountries)[0]??'United States',
  targetCountries:split(c.targetCountries),target_countries:split(c.targetCountries),originCountries:split(c.originCountries),
  watchHsCodes:split(c.hsCodes),productKeywordsArray:split(c.productKeywords),
  companyTypes:split(c.companyTypes),company_types:split(c.companyTypes),companyType:split(c.companyTypes)[0],
  businessType:split(c.companyTypes)[0],business_type:split(c.companyTypes),sector:split(c.industries)[0],industry:split(c.industries)[0],industries:split(c.industries),
  shipmentDateFrom:c.shipmentDateFrom||undefined,startDate:c.shipmentDateFrom||undefined,dateFrom:c.shipmentDateFrom||undefined,fromDate:c.shipmentDateFrom||undefined,
  shipmentDateTo:c.shipmentDateTo||undefined,endDate:c.shipmentDateTo||undefined,dateTo:c.shipmentDateTo||undefined,toDate:c.shipmentDateTo||undefined,
  minShipments:c.minShipments?Number(c.minShipments):undefined,min_shipments:c.minShipments?Number(c.minShipments):undefined,
  minImportValue:c.minImportValue?Number(c.minImportValue):undefined,min_import_value:c.minImportValue?Number(c.minImportValue):undefined,
  maxImportValue:c.maxImportValue?Number(c.maxImportValue):undefined,max_import_value:c.maxImportValue?Number(c.maxImportValue):undefined,
  activeRecently:c.activeRecently?Number(c.activeRecently):undefined,monthsBack:c.activeRecently?Number(c.activeRecently):undefined,lookbackMonths:c.activeRecently?Number(c.activeRecently):undefined,
  requireEmail:c.requireEmail,enrichEmails:c.requireEmail,includeEmail:c.requireEmail,
  requirePhone:c.requirePhone,includePhone:c.requirePhone,
  requireWebsite:c.requireWebsite,includeWebsite:c.requireWebsite,
  requireLinkedin:c.requireLinkedin,includeLinkedin:c.requireLinkedin,enrichSocials:c.requireLinkedin,
  decisionMakerTitles:split(c.decisionMakerTitles),jobTitles:split(c.decisionMakerTitles),titles:split(c.decisionMakerTitles),
  maxLeads:Number(c.maxResults)||100,maxResults:Number(c.maxResults)||100,limit:Number(c.maxResults)||100,maxRecords:Number(c.maxResults)||100,
 };
 for(const [key,def] of Object.entries(props) as [string,any][]){
  const match=Object.keys(values).find(k=>k.toLowerCase()===key.toLowerCase());
  if(match&&values[match]!==undefined&&values[match]!==''&&(!Array.isArray(values[match])||(values[match] as unknown[]).length)) {
   let candidate=values[match];
   const declared=Array.isArray(def?.type)?def.type[0]:def?.type;
   if(declared==='string'&&Array.isArray(candidate)) candidate=candidate.join(', ');
   if(declared==='string'&&typeof candidate==='number') candidate=String(candidate);\n   if((declared==='integer'||declared==='number')&&typeof candidate==='string'&&candidate.trim()!=='') candidate=Number(candidate);
   if(declared==='array'&&typeof candidate==='string') candidate=candidate.split(/[，,;；\\n]+/).map(x=>x.trim()).filter(Boolean);
   input[key]=candidate;
  }
  else if(def?.default!==undefined) input[key]=def.default;
  else if((actor.actor_id.includes('bill-of-lading-scraper'))&&key==='searchQuery') input[key]=[...split(c.productKeywords),...split(c.hsCodes)].join(' ');
 }
 if(actor.actor_id.includes('bill-of-lading-scraper')) { input.searchType='consignee'; input.searchQuery=input.searchQuery||[...split(c.productKeywords),...split(c.hsCodes)].join(' '); }
 if(actor.actor_id.includes('shipment-monitor')) {
  input.watchHsCodes=split(c.hsCodes); input.productKeywords=split(c.productKeywords);
 }
 if(actor.actor_id.includes('import-export-leads-finder')) {
  input.country=split(c.targetCountries)[0]||'India'; input.maxLeads=Number(c.maxResults)||100;
 }
 return input;
}
function schemaFields(schema:any){
 const props=schema?.properties??{};
 return Object.entries(props).map(([key,value]:[string,any])=>({key,type:Array.isArray(value.type)?value.type.join('|'):value.type??'unknown',required:(schema.required??[]).includes(key),description:value.description??'',enum:value.enum??[],default:value.default}));
}
export function ImportExportLeadsFinder({onApi}:Props){
 const [criteria,setCriteria]=useState<Criteria>(initial);
 const [actors,setActors]=useState<Actor[]>([]);
 const [selected,setSelected]=useState<Actor|null>(null);
 const [actorInput,setActorInput]=useState('{}');
 const [run,setRun]=useState<any>(null);
 const [results,setResults]=useState<any[]>([]);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [tab,setTab]=useState<'criteria'|'actor'|'results'>('criteria');
 const patch=(key:keyof Criteria,value:any)=>setCriteria(v=>({...v,[key]:value}));
 const ready=Boolean(criteria.productKeywords.trim()||criteria.hsCodes.trim());
 const mapped=useMemo(()=>selected?toActorInput(selected,criteria):{},[selected,criteria]);
 async function recommend(){
  setBusy(true);setError('');setRun(null);setResults([]);
  try{
   const response=await onApi('leads.actors.recommend',{criteria});
   const list=(response.actors??[]) as Actor[];
   setActors(list);
   if(!list.length) throw new Error('没有找到可用 Actor。请检查 Apify API 配置或调整产品关键词。');
   setSelected(list[0]);
   setActorInput(JSON.stringify(toActorInput(list[0],criteria),null,2));
   setTab('actor');
  }catch(e){setError(e instanceof Error?e.message:'Actor 推荐失败');}
  finally{setBusy(false);}
 }
 function choose(actor:Actor){setSelected(actor);setActorInput(JSON.stringify(toActorInput(actor,criteria),null,2));setTab('actor');}
 async function startRun(){
  if(!selected)return;
  let input:unknown;
  try{input=JSON.parse(actorInput);}catch{setError('Actor Input 必须是有效 JSON 对象。');return;}
  if(!input||typeof input!=='object'||Array.isArray(input)){setError('Actor Input 必须是 JSON 对象。');return;}
  setBusy(true);setError('');
  try{
   const response=await onApi('leads.run',{actorId:selected.actor_id,input,criteria});
   setRun(response.run);setResults(response.items??[]);setTab('results');
  }catch(e){setError(e instanceof Error?e.message:'Actor 启动失败');}
  finally{setBusy(false);}
 }
 async function refreshResults(){
  if(!run?.id)return;
  setBusy(true);setError('');
  try{const response=await onApi('leads.results',{runId:run.id});setRun(response.run);setResults(response.items??[]);}
  catch(e){setError(e instanceof Error?e.message:'结果读取失败');}
  finally{setBusy(false);}
 }
 const fields=schemaFields(selected?.input_schema);
 return <section className="leads-finder">
  <div className="leads-intro"><div><span className="leads-eyebrow">GLOBAL CUSTOMER DISCOVERY</span><h2>Import Export Leads Finder</h2><p>基于进口记录、提单、产品关键词与企业画像发现真实潜在客户。先提交完整条件，再由系统推荐 Actor；你确认 Actor 和实际输入参数后才会启动采集。</p></div><div className="leads-intro-stat"><strong>{actors.length||'—'}</strong><span>可选 Actor</span></div></div>
  <div className="leads-stepper" aria-label="客户发现流程"><span className={tab==='criteria'?'active':''}>01 搜索条件</span><i/><span className={tab==='actor'?'active':''}>02 Actor 推荐与选择</span><i/><span className={tab==='results'?'active':''}>03 采集结果</span></div>
  {error&&<div className="leads-error" role="alert">{error}</div>}
  {tab==='criteria'&&<div className="leads-layout">
   <div className="leads-form-main">
    <section className="leads-panel"><div className="leads-panel-head"><div><span>01 / TRADE SIGNALS</span><h3>产品与贸易行为</h3><p>尽可能提供产品描述和 HS Code，减少仅凭宽泛关键词产生的噪声。</p></div></div>
     <div className="leads-field-grid">
      <label className="leads-field wide"><span>产品关键词 <b>*</b></span><textarea rows={3} value={criteria.productKeywords} onChange={e=>patch('productKeywords',e.target.value)} placeholder="例如：stainless steel water bottle, vacuum flask, insulated bottle；支持多个关键词"/></label>
      <label className="leads-field"><span>HS Code</span><input value={criteria.hsCodes} onChange={e=>patch('hsCodes',e.target.value)} placeholder="例如：961700, 732393"/></label>
      <label className="leads-field"><span>目标进口国家 / 地区</span><input value={criteria.targetCountries} onChange={e=>patch('targetCountries',e.target.value)} placeholder="United States, Canada, Germany"/></label>
      <label className="leads-field"><span>供应来源国家 / 地区</span><input value={criteria.originCountries} onChange={e=>patch('originCountries',e.target.value)} placeholder="China, Vietnam, India"/></label>
      <label className="leads-field"><span>进口活跃时间（月）</span><select value={criteria.activeRecently} onChange={e=>patch('activeRecently',e.target.value)}><option value="">不限</option><option value="3">最近 3 个月</option><option value="6">最近 6 个月</option><option value="12">最近 12 个月</option><option value="24">最近 24 个月</option></select></label>
      <label className="leads-field"><span>提单 / 进口记录起始日期</span><input type="date" value={criteria.shipmentDateFrom} onChange={e=>patch('shipmentDateFrom',e.target.value)}/></label>
      <label className="leads-field"><span>提单 / 进口记录结束日期</span><input type="date" value={criteria.shipmentDateTo} onChange={e=>patch('shipmentDateTo',e.target.value)}/></label>
      <label className="leads-field"><span>最少进口 / 出货次数</span><input type="number" min="0" value={criteria.minShipments} onChange={e=>patch('minShipments',e.target.value)} placeholder="不限"/></label>
      <label className="leads-field"><span>最低进口货值（USD）</span><input type="number" min="0" value={criteria.minImportValue} onChange={e=>patch('minImportValue',e.target.value)} placeholder="不限"/></label>
      <label className="leads-field"><span>最高进口货值（USD）</span><input type="number" min="0" value={criteria.maxImportValue} onChange={e=>patch('maxImportValue',e.target.value)} placeholder="不限"/></label>
     </div>
    </section>
    <section className="leads-panel"><div className="leads-panel-head"><div><span>02 / COMPANY PROFILE</span><h3>企业画像与客户类型</h3><p>指定你希望触达的买家角色，而不是只寻找经营相关产品的公司。</p></div></div>
     <div className="leads-field-grid">
      <label className="leads-field"><span>客户类型</span><input value={criteria.companyTypes} onChange={e=>patch('companyTypes',e.target.value)} placeholder="Importer, Distributor, Wholesaler"/></label>
      <label className="leads-field"><span>行业 / 细分市场</span><input value={criteria.industries} onChange={e=>patch('industries',e.target.value)} placeholder="Retail, Foodservice, Industrial supply"/></label>
      <label className="leads-field wide"><span>采购 / 决策人职位关键词</span><input value={criteria.decisionMakerTitles} onChange={e=>patch('decisionMakerTitles',e.target.value)} placeholder="Purchasing Manager, Buyer, Sourcing Director"/></label>
      <label className="leads-field wide"><span>补充说明</span><textarea rows={2} value={criteria.notes} onChange={e=>patch('notes',e.target.value)} placeholder="例如：排除货运代理；优先持续采购且从东南亚采购的进口商。"/></label>
     </div>
    </section>
    <section className="leads-panel"><div className="leads-panel-head"><div><span>03 / CONTACT & QUALITY</span><h3>联系方式与结果质量</h3><p>联系方式通常需要第二阶段补全，不保证贸易数据 Actor 本身都能提供。</p></div></div>
     <div className="leads-checks">
      {([['requireEmail','企业邮箱'],['requirePhone','企业电话'],['requireWebsite','企业网站'],['requireLinkedin','LinkedIn 公司 / 人员资料']] as [keyof Criteria,string][]).map(([key,label])=><label key={key}><input type="checkbox" checked={Boolean(criteria[key])} onChange={e=>patch(key,e.target.checked)}/><span>{label}</span></label>)}
     </div>
     <div className="leads-field-grid compact"><label className="leads-field"><span>最多返回客户数</span><input type="number" min="1" max="5000" value={criteria.maxResults} onChange={e=>patch('maxResults',e.target.value)}/></label></div>
    </section>
   </div>
   <aside className="leads-side"><div className="leads-panel leads-side-card"><span className="leads-side-kicker">SEARCH QUALITY</span><h3>提高客户精准度</h3><ul><li>产品关键词与 HS Code 同时填写，便于交叉匹配。</li><li>明确进口国家和供应来源，区分目标市场与采购来源。</li><li>指定时间范围和最少进口次数，优先活跃买家。</li><li>贸易记录与联系人信息分开验证，避免把目录企业误判为真实进口商。</li></ul><div className="leads-side-note">只有当 Actor 的 Input Schema 支持相应字段时，条件才会发送给该 Actor；不支持的条件会在选择页明确展示。</div></div><button className="leads-primary" disabled={!ready||busy} onClick={()=>void recommend()}>{busy?'正在分析并推荐 Actor…':'分析条件并推荐 Actor'} <span>→</span></button><p className="leads-muted">必填：产品关键词或 HS Code 至少一项。</p></aside>
  </div>}
  {tab==='actor'&&<div className="leads-actor-workspace">
   <div className="leads-actor-list"><div className="leads-panel-head"><div><span>RECOMMENDED ACTORS</span><h3>推荐的 Apify Actor</h3><p>按数据类型、输入字段覆盖度和用途匹配度排序。</p></div></div>
    {actors.map(actor=><button key={actor.actor_id} className={'leads-actor-card'+(selected?.actor_id===actor.actor_id?' selected':'')} onClick={()=>choose(actor)}><span className="leads-actor-score">{Math.round(actor.score??0)}<small>匹配度</small></span><span className="leads-actor-copy"><b>{actor.title}</b><small>{actor.actor_id}</small><span>{actor.recommendation_reason||actor.description||'Apify 数据采集 Actor'}</span><small>已匹配 {actor.supported_fields?.length??0} 项条件；未支持 {actor.unsupported_fields?.length??0} 项</small></span><span className="leads-radio">{selected?.actor_id===actor.actor_id?'✓':''}</span></button>)}
    <button className="leads-back-link" onClick={()=>setTab('criteria')}>← 返回修改搜索条件</button>
   </div>
   <div className="leads-panel leads-schema-panel">
    {selected?<><div className="leads-panel-head"><div><span>ACTOR INPUT SCHEMA</span><h3>{selected.title}</h3><p>{selected.description||selected.actor_id}</p></div></div>
     <div className="leads-schema-summary"><b>{fields.length} 个输入字段</b><span>{fields.filter(f=>f.required).length} 个必填字段</span></div>
     <div className="leads-schema-fields">{fields.map(f=><div key={f.key}><b>{f.key}{f.required?' *':''}</b><span>{f.type}{f.default!==undefined?' · 默认 '+String(f.default):''}</span><small>{f.description||'Actor Schema 未提供字段说明'}</small>{f.enum.length>0&&<small>允许值：{f.enum.join(', ')}</small>}</div>)}</div>
     <label className="leads-field leads-json-field"><span>实际发送给 Actor 的 Input JSON（可编辑）</span><textarea rows={12} spellCheck={false} value={actorInput} onChange={e=>setActorInput(e.target.value)}/></label>
     <div className="leads-schema-warning">系统仅自动映射 Schema 中可确认支持的字段。已支持：{selected.supported_fields?.join('、')||'尚未识别'}。未支持：{selected.unsupported_fields?.join('、')||'无'}。请检查必填项及 JSON；不支持的条件不会被伪装成已生效的筛选。</div>
     <button className="leads-primary" disabled={busy} onClick={()=>void startRun()}>{busy?'正在启动 Apify…':'确认 Actor 并启动采集'} <span>→</span></button>
    </>:<p>请先选择 Actor。</p>}
   </div>
  </div>}
  {tab==='results'&&<section className="leads-panel leads-results"><div className="leads-results-head"><div><span>APIFY RUN</span><h3>客户发现采集结果</h3><p>{run?.id?'Run ID：'+run.id:'尚未启动'}</p></div><button className="leads-secondary" disabled={busy||!run?.id} onClick={()=>void refreshResults()}>{busy?'读取中…':'刷新运行状态与结果'}</button></div>
   {run&&<div className="leads-run-stats"><div><small>运行状态</small><b>{run.status||'UNKNOWN'}</b></div><div><small>已返回记录</small><b>{results.length.toLocaleString()}</b></div><div><small>Actor</small><b>{selected?.title||selected?.actor_id}</b></div></div>}
   {results.length?<div className="leads-result-list">{results.map((item,index)=><details key={index}><summary><b>{String(item.company_name??item.consignee??item.importer_name??item.name??item.title??'记录 '+(index+1))}</b><span>{String(item.country??item.importer_country??item.address??'')}</span></summary><pre>{JSON.stringify(item,null,2)}</pre></details>)}</div>:<div className="leads-empty">{run?.status==='SUCCEEDED'?'Actor 已完成，但没有返回记录。':'等待 Actor 完成。可刷新运行状态与结果。'}</div>}
   <button className="leads-back-link" onClick={()=>setTab('actor')}>← 返回 Actor 与输入参数</button>
  </section>}
 </section>;
}
