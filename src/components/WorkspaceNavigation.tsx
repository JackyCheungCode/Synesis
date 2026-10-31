import { ChartLine, Dashboard, Key, Product, SettingsAdjust } from './icons';
import type { WorkspacePage } from '../lib/router';
type Props={page:WorkspacePage;open:boolean;onNavigate:(page:WorkspacePage)=>void;onClose:()=>void};
export function WorkspaceNavigation({page,open,onNavigate,onClose}:Props){
 const items:{page:WorkspacePage;label:string;icon:typeof Dashboard}[]=[
  {page:'dashboard',label:'情报总览',icon:Dashboard},{page:'projects',label:'研究项目中心',icon:ChartLine},{page:'products',label:'标准化商品库',icon:Product},{page:'settings',label:'调研采集设置',icon:SettingsAdjust},{page:'vault',label:'AI 模型与 Key Vault',icon:Key}
 ];
 return <>
  <button className={'sn-nav-backdrop'+(open?' is-visible':'')} aria-label="关闭导航" tabIndex={open?0:-1} onClick={onClose}/>
  <aside id="synesis-navigation" className={'sn-nav-panel'+(open?' is-open':'')} aria-label="主导航" aria-hidden={!open}>
   <div className="sn-nav-heading"><span>WORKSPACE</span><b>跨境市场分析</b><small>研究 · 采集 · 洞察</small></div>
   <nav><span className="sn-nav-section">工作台</span>{items.map(({page:target,label,icon:Icon})=><a key={target} href={target==='projects'?'#/projects':'#/'+target} className={page===target?'is-active':''} aria-current={page===target?'page':undefined} tabIndex={open?0:-1} onClick={e=>{e.preventDefault();onNavigate(target);onClose();window.requestAnimationFrame(()=>document.getElementById('main-content')?.focus());}}><Icon size={18}/><span>{label}</span></a>)}</nav>
   <div className="sn-nav-footer">SYNESIS · TRADE INTELLIGENCE</div>
  </aside>
 </>;
}
