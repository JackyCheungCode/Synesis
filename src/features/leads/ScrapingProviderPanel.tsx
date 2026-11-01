import { useMemo, useState } from 'react';

type Props={onApi:(action:string,payload?:Record<string,unknown>)=>Promise<any>;query?:string;context:'social'|'trade'};
type Provider='apify'|'brightdata'|'octoparse'|'firecrawl'|'phantombuster'|'texau';
const names:Record<Provider,string>={apify:'Apify',brightdata:'Bright Data',octoparse:'Octoparse',firecrawl:'Firecrawl',phantombuster:'PhantomBuster',texau:'TexAu'};
const descriptions:Record<Provider,string>={
 apify:'使用现有 Actor 推荐、真实 Input Schema 动态表单、运行与 Dataset 结果流程。',
 brightdata:'Web Unlocker：对指定 HTTPS 页面发起网页提取。SERP 和站点专用数据集会按后续适配器开放。',
 octoparse:'运行你在 Octoparse 中已经创建的云采集任务，或读取任务状态与数据。',
 firecrawl:'支持 Search、单页 Scrape 与站点 Crawl，返回 Markdown / 结构化内容。',
 phantombuster:'发现你账户已有 Agent，按 Agent 参数启动，并查询状态或输出。',
 texau:'当前提供邮箱 waterfall enrichment；需要姓名和企业域名，不是通用网页搜索。',
};
export function ScrapingProviderPanel({onApi,query='',context}:Props){
 const [provider,setProvider]=useState<Provider>('apify');
 const [operation,setOperation]=useState('search');
 const [url,setUrl]=useState('');
 const [taskId,setTaskId]=useState('');
 const [agentId,setAgentId]=useState('');
 const [argument,setArgument]=useState('{}');
 const [firstName,setFirstName]=useState('');
 const [lastName,setLastName]=useState('');
 const [domain,setDomain]=useState('');
 const [limit,setLimit]=useState('10');
 const [format,setFormat]=useState('markdown');
 const [offset,setOffset]=useState('0');
 const [output,setOutput]=useState<any>(null);
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const effectiveQuery=useMemo(()=>query.trim(),[query]);
 async function execute(){
  setBusy(true);setError('');setOutput(null);
  try{
   let input:Record<string,unknown>={};
   if(provider==='firecrawl'){
    if(operation==='search')input={query:effectiveQuery,limit:Number(limit)||10};
    else input={url,limit:Number(limit)||50,formats:[format]};
   }else if(provider==='brightdata')input={url,format:format==='json'?'json':'raw'};
   else if(provider==='octoparse')input={taskId,offset:Number(offset)||0,size:100};
   else if(provider==='phantombuster'){
    let parsed:unknown={};try{parsed=JSON.parse(argument);}catch{throw new Error('Agent Argument 必须是有效 JSON');}
    input={agentId,argument:parsed};
   }else if(provider==='texau')input={first_name:firstName,last_name:lastName,domain};
   const result=await onApi('scraping.execute',{provider,operation,input});
   setOutput(result);
  }catch(e){setError(e instanceof Error?e.message:'采集服务请求失败');}
  finally{setBusy(false);}
 }
 const ready=provider==='apify'?false:provider==='firecrawl'?operation==='search'?Boolean(effectiveQuery):/^https:\/\//i.test(url):provider==='brightdata'?/^https:\/\//i.test(url):provider==='octoparse'?Boolean(taskId.trim()):provider==='phantombuster'?operation==='discover'||Boolean(agentId.trim()):Boolean(firstName.trim()&&lastName.trim()&&domain.trim());
 return <section className="leads-panel scraping-provider-panel">
  <div className="leads-panel-head"><div><span>UNIFIED SCRAPING PROVIDERS</span><h3>选择本次采集服务</h3><p>不同服务商提供不同工具与参数；Synesis 会按所选服务商使用对应 API，不会把一种服务的参数错误地传给另一家。</p></div></div>
  <div className="leads-field-grid">
   <label className="leads-field"><span>采集服务商</span><select value={provider} onChange={e=>{setProvider(e.target.value as Provider);setOutput(null);setError('');setOperation(e.target.value==='firecrawl'?'search':e.target.value==='brightdata'?'unlock':e.target.value==='octoparse'?'start':e.target.value==='phantombuster'?'discover':'email_enrichment');}}>
    <option value="apify">Apify（现有 Actor 工作流）</option><option value="brightdata">Bright Data</option><option value="octoparse">Octoparse</option><option value="firecrawl">Firecrawl</option><option value="phantombuster">PhantomBuster</option><option value="texau">TexAu</option>
   </select></label>
   <div className="leads-field"><span>服务能力</span><p className="leads-muted">{descriptions[provider]}</p></div>
   {provider==='firecrawl'&&<>
    <label className="leads-field"><span>操作</span><select value={operation} onChange={e=>setOperation(e.target.value)}><option value="search">Search · 搜索网页</option><option value="scrape">Scrape · 抓取单页</option><option value="crawl">Crawl · 爬取网站</option></select></label>
    {operation==='search'?<div className="leads-field"><span>搜索词</span><input value={effectiveQuery} readOnly placeholder="先填写上方需求关键词"/></div>:<label className="leads-field"><span>目标 HTTPS URL</span><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://example.com"/></label>}
    <label className="leads-field"><span>最大结果 / 页面数</span><input type="number" min="1" max={operation==='crawl'?500:100} value={limit} onChange={e=>setLimit(e.target.value)}/></label>
   </>}
   {provider==='brightdata'&&<><label className="leads-field"><span>操作</span><select value="unlock" disabled><option value="unlock">Web Unlocker</option></select></label><label className="leads-field wide"><span>目标 HTTPS URL</span><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://example.com"/></label><label className="leads-field"><span>返回格式</span><select value={format} onChange={e=>setFormat(e.target.value)}><option value="raw">HTML / Raw</option><option value="json">JSON</option></select></label></>}
   {provider==='octoparse'&&<><label className="leads-field"><span>操作</span><select value={operation} onChange={e=>setOperation(e.target.value)}><option value="start">启动已有云任务</option><option value="status">查询任务状态</option><option value="results">读取任务数据</option></select></label><label className="leads-field"><span>Octoparse Task ID</span><input value={taskId} onChange={e=>setTaskId(e.target.value)} placeholder="填写已创建的 Task ID"/></label>{operation==='results'&&<label className="leads-field"><span>数据 Offset</span><input type="number" min="0" value={offset} onChange={e=>setOffset(e.target.value)}/></label>}</>}
   {provider==='phantombuster'&&<><label className="leads-field"><span>操作</span><select value={operation} onChange={e=>setOperation(e.target.value)}><option value="discover">发现账户 Agent</option><option value="launch">启动 Agent</option><option value="status">查询 Agent 状态</option><option value="output">读取 Agent 输出</option></select></label>{operation!=='discover'&&<><label className="leads-field"><span>Agent ID</span><input value={agentId} onChange={e=>setAgentId(e.target.value)} placeholder="填写 Agent ID"/></label>{operation==='launch'&&<label className="leads-field wide"><span>Agent Argument JSON</span><textarea rows={4} value={argument} onChange={e=>setArgument(e.target.value)}/></label>}</>}</>}
   {provider==='texau'&&<><label className="leads-field"><span>操作</span><select value="email_enrichment" disabled><option value="email_enrichment">Email Finding Waterfall</option></select></label><label className="leads-field"><span>名</span><input value={firstName} onChange={e=>setFirstName(e.target.value)} placeholder="First name"/></label><label className="leads-field"><span>姓</span><input value={lastName} onChange={e=>setLastName(e.target.value)} placeholder="Last name"/></label><label className="leads-field wide"><span>企业域名</span><input value={domain} onChange={e=>setDomain(e.target.value)} placeholder="example.com"/></label></>}
  </div>
  {provider==='apify'?<p className="leads-side-note">Apify 已保留在原有工作流中：先推荐 Actor，再读取真实 Input Schema，确认参数后启动。选择其他服务商时，将显示对应服务的专用操作。</p>:<button className="leads-primary" disabled={busy||!ready} onClick={()=>void execute()}>{busy?'正在请求 '+names[provider]+'…':'使用 '+names[provider]+' 执行'} <span>→</span></button>}
  {error&&<div className="leads-error" role="alert">{error}</div>}
  {output&&<div className="scraping-provider-output"><div className="leads-panel-head"><div><span>PROVIDER RESPONSE</span><h3>{names[provider]} 返回结果</h3><p>原始服务响应预览。统一字段映射、客户去重与写入全球线索库将在标准化层完成。</p></div></div><pre>{JSON.stringify(output,null,2)}</pre></div>}
 </section>;
}
