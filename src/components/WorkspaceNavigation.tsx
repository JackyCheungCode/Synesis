import { Search, Key } from './icons';
import type { WorkspacePage } from '../lib/router';
type Props={page:WorkspacePage;open:boolean;onNavigate:(page:WorkspacePage)=>void;onClose:()=>void};
export function WorkspaceNavigation({page,open,onNavigate,onClose}:Props){
 const items:{page:WorkspacePage;label:string;icon:typeof Search}[]=[
  {page:'leads',label:'Import Export Leads Finder',icon:Search},
  {page:'vault',label:'API 与 AI 配置',icon:Key},
 ];
 return <>
  <button className={'sn-nav-backdrop'+(open?' is-visible':'')} aria-label="关闭导航" tabIndex={open?0:-1} onClick={onClose}/>
  <aside id="synesis-navigation" className={'sn-nav-panel'+(open?' is-open':'')} aria-label="主导航" aria-hidden={!open}>
   <div className="sn-nav-heading"><span>GLOBAL CUSTOMER DISCOVERY</span><b>全球客户发现</b><small>进口商 · 贸易线索 · 企业联系人</small></div>
   <nav><span className="sn-nav-section">客户发现</span>{items.map(({page:target,label,icon:Icon})=><a key={target} href={'#/'+target} className={page===target?'is-active':''} aria-current={page===target?'page':undefined} tabIndex={open?0:-1} onClick={e=>{e.preventDefault();onNavigate(target);onClose();window.requestAnimationFrame(()=>document.getElementById('main-content')?.focus());}}><Icon size={18}/><span>{label}</span></a>)}</nav>
   <div className="sn-nav-footer">SYNESIS · GLOBAL LEADS</div>
  </aside>
 </>;
}
