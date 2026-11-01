import { useEffect, useState } from 'react';

type Props={onApi:(action:string,payload?:Record<string,unknown>)=>Promise<any>};
type Lead={id:string;customer_type:'company'|'person'|'unknown';display_name:string;country?:string|null;industry?:string|null;business_role?:string|null;intent_type?:string|null;intent_strength?:string|null;lead_score?:number|null;profile_url?:string|null;website_url?:string|null;lifecycle_status:string;first_seen_at:string;last_seen_at:string};

const typeLabel:Record<string,string>={company:'企业客户',person:'个人客户',unknown:'待识别'};
const statusLabel:Record<string,string>={new:'新线索',qualified:'已筛选',contacted:'已联系',in_progress:'跟进中',converted:'已转化',disqualified:'不合格',archived:'已归档'};

export function GlobalLeads({onApi}:Props){
 const [leads,setLeads]=useState<Lead[]>([]);
 const [customerType,setCustomerType]=useState('all');
 const [search,setSearch]=useState('');
 const [busy,setBusy]=useState(false);
 const [analyzing,setAnalyzing]=useState('');
 const [analysisNotice,setAnalysisNotice]=useState('');
 const [error,setError]=useState('');
 async function analyzeLead(leadId:string){
  setAnalyzing(leadId);setError('');
  try{const result=await onApi('social.ai.analyze',{leadId});setAnalysisNotice('AI 分析完成，客户评分 '+result.analysis.lead_score+'/100。');await load();}
  catch(e){setError(e instanceof Error?e.message:'AI 客户分析失败');}
  finally{setAnalyzing('');}
 }
 async function load(){
  setBusy(true);setError('');
  try{const response=await onApi('global.leads.list',{customerType,search});setLeads((response.leads??[]) as Lead[]);}
  catch(e){setError(e instanceof Error?e.message:'全球客户线索加载失败');}
  finally{setBusy(false);}
 }
 useEffect(()=>{void load();},[customerType]);
 const companies=leads.filter(item=>item.customer_type==='company').length;
 const people=leads.filter(item=>item.customer_type==='person').length;
 return <section className="leads-finder global-leads-page">
  <div className="leads-intro"><div><span className="leads-eyebrow">GLOBAL CUSTOMER DISCOVERY / CRM</span><h2>全球客户线索库</h2><p>统一管理 Import Export 与 Social Leads 发现的客户。跨平台、跨需求、跨来源合并客户主体，同时保留每一条原始来源和证据。</p></div><div className="leads-intro-stat"><strong>{leads.length}</strong><span>当前结果</span></div></div>
  <div className="global-leads-stats">
   <div className="leads-panel"><span>企业客户</span><strong>{companies}</strong></div>
   <div className="leads-panel"><span>个人客户</span><strong>{people}</strong></div>
   <div className="leads-panel"><span>待识别</span><strong>{leads.filter(item=>item.customer_type==='unknown').length}</strong></div>
  </div>
  <div className="leads-panel">
   <div className="global-leads-toolbar">
    <label className="leads-field"><span>客户分类</span><select value={customerType} onChange={e=>setCustomerType(e.target.value)}><option value="all">全部客户</option><option value="company">企业客户</option><option value="person">个人客户</option><option value="unknown">待识别</option></select></label>
    <label className="leads-field global-leads-search"><span>搜索客户名称</span><input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void load();}} placeholder="输入企业或个人名称"/></label>
    <button className="leads-secondary" onClick={()=>void load()} disabled={busy}>{busy?'加载中…':'搜索 / 刷新'}</button>
   </div>
   {error&&<div className="leads-error" role="alert">{error}</div>}
   {analysisNotice&&<div className="leads-schema-warning" role="status">{analysisNotice}</div>}
   {busy?<div className="leads-empty">正在加载全球客户线索…</div>:leads.length===0?<div className="leads-empty">暂无客户线索。完成社媒采集并同步结果后，客户会自动汇入这里。</div>:
    <div className="global-leads-table-wrap"><table className="global-leads-table"><thead><tr><th>客户</th><th>类型</th><th>国家 / 地区</th><th>行业 / 角色</th><th>商业意向</th><th>评分</th><th>状态</th><th>来源资料</th><th>AI 分析</th></tr></thead><tbody>
     {leads.map(lead=><tr key={lead.id}><td><strong>{lead.display_name}</strong><small>{lead.website_url||lead.profile_url||'尚无公开主页'}</small></td><td><span className={'global-lead-type '+lead.customer_type}>{typeLabel[lead.customer_type]}</span></td><td>{lead.country||'—'}</td><td>{[lead.industry,lead.business_role].filter(Boolean).join(' · ')||'—'}</td><td>{lead.intent_type||'待分析'}</td><td>{lead.lead_score===null||lead.lead_score===undefined?'—':lead.lead_score+'/100'}</td><td>{statusLabel[lead.lifecycle_status]||lead.lifecycle_status}</td><td>{lead.profile_url?<a href={lead.profile_url} target="_blank" rel="noreferrer">公开主页 ↗</a>:lead.website_url?<a href={lead.website_url} target="_blank" rel="noreferrer">企业官网 ↗</a>:'—'}</td><td><button className="leads-secondary" onClick={()=>void analyzeLead(lead.id)} disabled={Boolean(analyzing)||busy}>{analyzing===lead.id?'分析中…':lead.intent_type?'重新分析':'AI 分析'}</button></td></tr>)}
    </tbody></table></div>}
   <p className="leads-muted">当前列表最多展示最近 250 条。客户主体按当前用户工作区隔离；跨平台、跨需求、跨来源在同一工作区内去重。</p>
  </div>
 </section>;
}
