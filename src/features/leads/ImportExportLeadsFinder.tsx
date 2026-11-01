import { useState } from 'react';
import { DynamicActorForm } from './DynamicActorForm';
import { ScrapingProviderPanel } from './ScrapingProviderPanel';
import { MultiSelect, countryOptions } from './MultiSelect';
const companyTypeOptions = [
 {value:'Importer',label:'进口商'},{value:'Distributor',label:'分销商'},{value:'Wholesaler',label:'批发商'},
 {value:'Retailer',label:'零售商'},{value:'Brand owner',label:'品牌方'},{value:'Manufacturer',label:'制造商'},
 {value:'Trading company',label:'贸易公司'},{value:'E-commerce seller',label:'电商卖家'},{value:'Sourcing agent',label:'采购代理'},
 {value:'Buying office',label:'采购办事处'},{value:'Marketplace seller',label:'平台卖家'}
];

type Criteria = {
  productKeywords: string; hsCodes: string; targetCountries: string; originCountries: string;
  companyTypes: string; industries: string; shipmentDateFrom: string; shipmentDateTo: string;
  knownImporters:string; knownSuppliers:string; destinationPorts:string; originPorts:string; excludeKeywords:string; employeeRange:string;
  minShipments: string; minImportValue: string; maxImportValue: string; activeRecently: string;
  requireEmail: boolean; requirePhone: boolean; requireWebsite: boolean; requireLinkedin: boolean;
  decisionMakerTitles: string; maxResults: string; notes: string;
};
type Actor = { actor_id: string; title: string; description?: string; score?: number; recommendation_reason?: string; input_schema?: any; schema_hash?: string; schema_fetched_at?: string; stats?: any; supported_fields?: string[]; unsupported_fields?: string[] };
type Props = { onApi: (action: string, payload?: Record<string, unknown>) => Promise<any> };
const initial: Criteria = {
  productKeywords:'',hsCodes:'',targetCountries:'United States',originCountries:'',companyTypes:'Importer, Distributor, Wholesaler',
  industries:'',shipmentDateFrom:'',shipmentDateTo:'',knownImporters:'',knownSuppliers:'',destinationPorts:'',originPorts:'',excludeKeywords:'',employeeRange:'',minShipments:'',minImportValue:'',maxImportValue:'',activeRecently:'12',
  requireEmail:true,requirePhone:false,requireWebsite:true,requireLinkedin:false,decisionMakerTitles:'Purchasing Manager, Procurement Manager, Import Manager, Buyer',
  maxResults:'100',notes:'',
};
const split = (v:string) => v.split(/[，,;；\\n]+/).map(x=>x.trim()).filter(Boolean);
function toActorInput(actor:Actor, c:Criteria):Record<string,unknown>{
 const props=actor.input_schema?.properties??{};
 const input:Record<string,unknown>={};
 for(const [key,definition] of Object.entries(props) as [string,any][]) if(definition?.default!==undefined) input[key]=definition.default;
 const set=(key:string,value:unknown)=>{
  const definition=props[key];
  if(!definition||value===undefined||value===null||value===''||(Array.isArray(value)&&!value.length)) return;
  const type=Array.isArray(definition.type)?definition.type.find((item:string)=>item!=='null'):definition.type;
  let next=value;
  if(type==='array'&&!Array.isArray(next)) next=String(next).split(/[，,;；\n]+/).map(item=>item.trim()).filter(Boolean);
  if(type==='string'&&Array.isArray(next)) next=next.join(', ');
  if((type==='integer'||type==='number')&&typeof next==='string') next=Number(next);
  if(type==='integer'&&typeof next==='number'&&!Number.isInteger(next)) return;
  if(type==='number'&&typeof next==='number'&&!Number.isFinite(next)) return;
  if(Array.isArray(definition.enum)&&!definition.enum.some((option:unknown)=>String(option).toLowerCase()===String(next).toLowerCase())) return;
  input[key]=next;
 };
 const keywords=split(c.productKeywords), hsCodes=split(c.hsCodes);
 if(actor.actor_id==='fortuitous_pirate/bill-of-lading-scraper'){
  set('searchType','consignee'); set('searchQuery',[...keywords,...hsCodes].join(' '));
 }
 if(actor.actor_id==='flamboyant_liner/shipment-monitor'){
  set('watchHsCodes',hsCodes); set('productKeywords',keywords);
  set('watchConsignees',split(c.knownImporters)); set('watchShippers',split(c.knownSuppliers));
 }
 if(actor.actor_id==='akash9078/import-export-leads-finder'){
  const country=split(c.targetCountries)[0], countryEnum=props.country?.enum;
  const countryAliases:Record<string,string>={'united states':'US','usa':'US','u.s.':'US','united kingdom':'UK','great britain':'UK','south korea':'South Korea'};
  if(country){
   const normalized=countryAliases[country.toLowerCase()]??country;
   const match=Array.isArray(countryEnum)?countryEnum.find((option:unknown)=>[country,normalized].some(candidate=>String(option).toLowerCase()===candidate.toLowerCase())):normalized;
   if(match!==undefined)set('country',match);else delete input.country;
  }
  const sector=split(c.industries)[0], sectorEnum=props.sector?.enum;
  if(sector){const match=Array.isArray(sectorEnum)?sectorEnum.find((option:unknown)=>String(option).toLowerCase()===sector.toLowerCase()):sector;if(match!==undefined)set('sector',match);else delete input.sector;}
  set('maxLeads',Number(c.maxResults)||undefined);
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
 const [actorValues,setActorValues]=useState<Record<string,unknown>>({});
 const [actorDrafts,setActorDrafts]=useState<Record<string,Record<string,unknown>>>({});
 const [rawJsonMode,setRawJsonMode]=useState(false);
 const [schemaLoading,setSchemaLoading]=useState(false);
 const [schemaError,setSchemaError]=useState('');
 const [run,setRun]=useState<any>(null);
 const [results,setResults]=useState<any[]>([]);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [tab,setTab]=useState<'criteria'|'actor'|'results'>('criteria');
 const patch=(key:keyof Criteria,value:any)=>setCriteria(v=>({...v,[key]:value}));
 const ready=Boolean(criteria.productKeywords.trim()||criteria.hsCodes.trim());
 async function loadActorSchema(actor:Actor){
  setSelected({...actor,input_schema:null});setSchemaLoading(true);setError('');setSchemaError('');setRawJsonMode(false);
  try{
   const response=await onApi('leads.actor.schema',{actorId:actor.actor_id});
   if(!response?.schema) throw new Error(response?.error??'Actor 未提供可读取的 Input Schema');
   const refreshed={...actor,input_schema:response.schema,schema_hash:response.schema_hash,schema_fetched_at:response.fetched_at,schema_build_id:response.build_id};
   setSelected(refreshed);
   const initialInput=actorDrafts[actor.actor_id]??toActorInput(refreshed,criteria);
   setActorValues(initialInput);setActorInput(JSON.stringify(initialInput,null,2));
  }catch(e){
   const message=e instanceof Error?e.message:'无法读取所选 Actor 的最新 Input Schema';
   setSchemaError(message);
   setSelected({...actor,input_schema:null});
   setActorValues({});setActorInput('{}');
  }finally{setSchemaLoading(false);}
 }
 async function recommend(){
  setBusy(true);setError('');setRun(null);setResults([]);
  try{
   const response=await onApi('leads.actors.recommend',{criteria});
   const list=(response.actors??[]) as Actor[];
   setActors(list);
   if(!list.length) throw new Error('没有找到可用 Actor。请检查 Apify API 配置或调整产品关键词。');
   setTab('actor');
   await loadActorSchema(list[0]);
  }catch(e){setError(e instanceof Error?e.message:'Actor 推荐失败');}
  finally{setBusy(false);}
 }
 function choose(actor:Actor){void loadActorSchema(actor);}
 function updateActorValues(next:Record<string,unknown>){
  setActorValues(next);setActorInput(JSON.stringify(next,null,2));
  if(selected)setActorDrafts(previous=>({...previous,[selected.actor_id]:next}));
 }
 async function startRun(){
  if(!selected)return;
  let input:unknown=actorValues;
  if(rawJsonMode){try{input=JSON.parse(actorInput);}catch{setError('Actor Input 必须是有效 JSON 对象。');return;}}
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
  <div className="leads-intro"><div><span className="leads-eyebrow">GLOBAL CUSTOMER DISCOVERY</span></div><div className="leads-intro-stat"><strong>{actors.length||'—'}</strong><span>可选 Actor</span></div></div>
  <ScrapingProviderPanel onApi={onApi} query={[criteria.productKeywords,criteria.hsCodes].filter(Boolean).join(' ')} context="trade"/>
  <div className="leads-stepper" aria-label="客户发现流程"><span className={tab==='criteria'?'active':''}>01 搜索条件</span><i/><span className={tab==='actor'?'active':''}>02 Actor 推荐与选择</span><i/><span className={tab==='results'?'active':''}>03 采集结果</span></div>
  {error&&<div className="leads-error social-leads-error" role="alert"><span>{error}</span><button type="button" aria-label="关闭错误提示" onClick={()=>setError("")}>关闭</button></div>}
  {tab==='criteria'&&<div className="leads-layout">
   <div className="leads-form-main">
    <section className="leads-panel"><div className="leads-panel-head"><div><span>01 / TRADE SIGNALS</span><h3>产品与贸易行为</h3><p>尽可能提供产品描述和 HS Code，减少仅凭宽泛关键词产生的噪声。</p></div></div>
     <div className="leads-field-grid">
      <label className="leads-field wide"><span>产品关键词 <b>*</b></span><textarea rows={3} value={criteria.productKeywords} onChange={e=>patch('productKeywords',e.target.value)} placeholder="例如：stainless steel water bottle, vacuum flask, insulated bottle；支持多个关键词"/></label>
      <label className="leads-field"><span>HS Code</span><input value={criteria.hsCodes} onChange={e=>patch('hsCodes',e.target.value)} placeholder="例如：961700, 732393"/></label>
      <div className="leads-field"><MultiSelect label="目标进口国家 / 地区" value={split(criteria.targetCountries)} options={countryOptions} onChange={items=>patch('targetCountries',items.join(', '))} placeholder="搜索国家并多选…" /></div>
      <div className="leads-field"><MultiSelect label="供应来源国家 / 地区" value={split(criteria.originCountries)} options={countryOptions} onChange={items=>patch('originCountries',items.join(', '))} placeholder="搜索国家并多选…" /></div>
      <label className="leads-field wide"><span>已知进口商 / 收货人名称</span><input value={criteria.knownImporters} onChange={e=>patch('knownImporters',e.target.value)} placeholder="可填写公司名称或 ImportYeti slug，多个用逗号分隔"/></label>
      <label className="leads-field wide"><span>已知海外供应商 / 发货人名称</span><input value={criteria.knownSuppliers} onChange={e=>patch('knownSuppliers',e.target.value)} placeholder="用于追踪供应链关系，多个用逗号分隔"/></label>
      <label className="leads-field"><span>目的港 / 卸货港</span><input value={criteria.destinationPorts} onChange={e=>patch('destinationPorts',e.target.value)} placeholder="Los Angeles, New York"/></label>
      <label className="leads-field"><span>起运港 / 装货港</span><input value={criteria.originPorts} onChange={e=>patch('originPorts',e.target.value)} placeholder="Shanghai, Ningbo, Shenzhen"/></label>
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
      <div className="leads-field"><MultiSelect label="客户类型" value={split(criteria.companyTypes)} options={companyTypeOptions} onChange={items=>patch('companyTypes',items.join(', '))} placeholder="搜索客户类型并多选…" /></div>
      <label className="leads-field"><span>行业 / 细分市场</span><input value={criteria.industries} onChange={e=>patch('industries',e.target.value)} placeholder="Retail, Foodservice, Industrial supply"/></label>
      <label className="leads-field"><span>企业员工规模</span><select value={criteria.employeeRange} onChange={e=>patch('employeeRange',e.target.value)}><option value="">不限</option><option value="1-10">1–10 人</option><option value="11-50">11–50 人</option><option value="51-200">51–200 人</option><option value="201-500">201–500 人</option><option value="501-1000">501–1,000 人</option><option value="1001-5000">1,001–5,000 人</option><option value="5000+">5,000 人以上</option></select></label>
      <label className="leads-field"><span>排除关键词 / 公司</span><input value={criteria.excludeKeywords} onChange={e=>patch('excludeKeywords',e.target.value)} placeholder="例如：freight forwarder, logistics broker"/></label>
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
    {selected?<><div className="leads-panel-head"><div><span>LIVE ACTOR INPUT SCHEMA</span><h3>{selected.title}</h3><p>{selected.description||selected.actor_id}</p></div></div>
     <div className="leads-schema-summary"><b>{fields.length} 个输入字段</b><span>{fields.filter(f=>f.required).length} 个必填字段</span><span>{schemaLoading?'正在刷新 Schema…':selected.schema_hash?'Schema 版本 '+selected.schema_hash.slice(0,10):schemaError?'Schema 不可用':'Schema 已加载'}</span></div>
     {schemaLoading?<div className="leads-empty">正在读取该 Actor 当前版本的参数定义…</div>:<>
      <div className="leads-schema-warning">可自动映射的通用条件：{selected.supported_fields?.join('、')||'暂无'}。未匹配到已验证参数的条件：{selected.unsupported_fields?.join('、')||'无'}。只有明确验证过的 Actor 专属字段才会自动填入；其他参数请在下方填写。</div>
      {!rawJsonMode&&<DynamicActorForm schema={selected.input_schema} schemaError={schemaError} value={actorValues} onChange={updateActorValues}/>}
      <div className="actor-json-tools"><button type="button" className="leads-back-link" onClick={()=>{if(rawJsonMode){try{const parsed=JSON.parse(actorInput);if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error();setActorValues(parsed as Record<string,unknown>);if(selected)setActorDrafts(previous=>({...previous,[selected.actor_id]:parsed as Record<string,unknown>}));}catch{setError('JSON 格式无效，修正后才能返回动态表单。');return;}}else{setActorInput(JSON.stringify(actorValues,null,2));}setRawJsonMode(!rawJsonMode);}}>{rawJsonMode?'返回动态表单':'高级模式：编辑原始 JSON'}</button><span>提交前将由服务端按最新 Schema 再次校验</span></div>
      {rawJsonMode&&<label className="leads-field leads-json-field"><span>Actor Input JSON</span><textarea rows={14} spellCheck={false} value={actorInput} onChange={e=>setActorInput(e.target.value)}/></label>}
      <div className="leads-schema-warning">默认值会自动填入；必填项以 * 标记。数组支持逗号或换行输入，复杂对象可使用高级 JSON 模式。</div>
      <button className="leads-primary" disabled={busy||schemaLoading||(!selected.input_schema&&!rawJsonMode)} onClick={()=>void startRun()}>{busy?'正在启动 Apify…':'确认参数并启动采集'} <span>→</span></button>
     </>}
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
