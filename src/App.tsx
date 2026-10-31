import { useMemo, useState } from 'react';
import {
  Add, Analytics, ArrowRight, ChartLine, ChevronDown, ChevronRight, Cloud,
  Dashboard, DataBase, Document, Folder, Globe, Menu, Moon, Notification,
  Search, Settings, Sun, Task, WatsonHealth, Close, Api,
} from '@carbon/icons-react';
import { Button, InlineNotification, Tag, TextInput, Tile } from '@carbon/react';
import { BrandIcon } from './components/BrandIcon';
import { platforms, providers, services } from './data/catalog';

type Page = 'dashboard' | 'platforms' | 'ai-models' | 'projects' | 'market-watch' | 'reports';

const navPlatformItems = platforms;
const initialKeys: Record<string, string> = {};

function App() {
  const [theme, setTheme] = useState<'white' | 'g100'>(() => {
    const saved = localStorage.getItem('synesis-theme');
    return saved === 'g100' ? 'g100' : 'white';
  });
  const [page, setPage] = useState<Page>('dashboard');
  const [expanded, setExpanded] = useState({ intelligence: true, ai: true });
  const [search, setSearch] = useState('');
  const [apiKeys, setApiKeys] = useState<Record<string, string>>(initialKeys);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState('');
  const [mobileNav, setMobileNav] = useState(false);

  const dark = theme === 'g100';
  const activeTitle = useMemo(() => ({
    dashboard: '全球外贸情报总览',
    platforms: '平台数据中心',
    'ai-models': 'AI 模型与 API 管理',
    projects: '研究项目中心',
    'market-watch': '市场监控',
    reports: '市场研究报告',
  } satisfies Record<Page, string>)[page], [page]);

  function switchTheme() {
    const next = dark ? 'white' : 'g100';
    setTheme(next);
    localStorage.setItem('synesis-theme', next);
  }

  function saveKey(provider: string) {
    setNotice(`${provider}：前端输入界面已就绪。安全凭证 API 尚未部署，密钥没有发送或保存。`);
  }

  return (
    <div className={`synesis-shell ${dark ? 'theme-dark' : 'theme-light'}`}>
      <aside className={`side-nav ${mobileNav ? 'side-nav--open' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-symbol"><span /></div>
          <span className="brand-word">SYNESIS</span>
          <button className="mobile-close" onClick={() => setMobileNav(false)} aria-label="Close navigation"><Close size={20} /></button>
        </div>
        <nav className="nav-scroll" aria-label="Primary navigation">
          <button className={`nav-link ${page === 'dashboard' ? 'is-active' : ''}`} onClick={() => setPage('dashboard')}><Dashboard size={20}/><span>Dashboard</span></button>
          <button className="nav-link nav-link--parent" onClick={() => setExpanded(v => ({ ...v, intelligence: !v.intelligence }))}>
            <Globe size={20}/><span>全球外贸情报中心</span>{expanded.intelligence ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
          </button>
          {expanded.intelligence && <div className="nav-submenu">
            {navPlatformItems.map(item => <button key={item.name} className="nav-link nav-link--child" onClick={() => setPage('platforms')}><BrandIcon slug={item.slug} label={item.name} fallback={item.fallback} size={20}/><span>{item.name}</span></button>)}
            <button className="nav-link nav-link--child" onClick={() => setPage('platforms')}><WatsonHealth size={19}/><span>AI 市场分析</span></button>
          </div>}
          <button className="nav-link nav-link--parent" onClick={() => setExpanded(v => ({ ...v, ai: !v.ai }))}>
            <WatsonHealth size={20}/><span>AI 智能中心</span>{expanded.ai ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
          </button>
          {expanded.ai && <div className="nav-submenu">
            <button className={`nav-link nav-link--child ${page === 'ai-models' ? 'is-active' : ''}`} onClick={() => setPage('ai-models')}><Api size={18}/><span>模型与 API 管理</span></button>
            <button className="nav-link nav-link--child" onClick={() => setNotice('AI 任务中心将在后续模块迭代中接入。')}><Task size={18}/><span>AI 任务中心</span></button>
            <button className="nav-link nav-link--child" onClick={() => setNotice('模型智能路由将在后续模块迭代中接入。')}><Analytics size={18}/><span>模型智能路由</span></button>
            <button className="nav-link nav-link--child" onClick={() => setNotice('AI 工作流将在后续模块迭代中接入。')}><Cloud size={18}/><span>AI 工作流</span></button>
          </div>}
          <button className={`nav-link ${page === 'projects' ? 'is-active' : ''}`} onClick={() => setPage('projects')}><Folder size={20}/><span>研究项目中心</span></button>
          <button className={`nav-link ${page === 'market-watch' ? 'is-active' : ''}`} onClick={() => setPage('market-watch')}><ChartLine size={20}/><span>Market Watch</span></button>
          <button className={`nav-link ${page === 'reports' ? 'is-active' : ''}`} onClick={() => setPage('reports')}><Document size={20}/><span>市场研究报告</span></button>
          <button className="nav-link" onClick={() => setNotice('基础设施连接状态将在系统设置模块接入。')}><DataBase size={20}/><span>数据与连接</span></button>
          <button className="nav-link" onClick={() => setNotice('系统设置将在后续模块迭代中接入。')}><Settings size={20}/><span>系统设置</span></button>
        </nav>
        <div className="side-footer"><span className="status-dot" />Synesis · Initial build <small>Global Trade Intelligence</small></div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={22}/></button>
          <div className="global-search"><Search size={20}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索平台、商品、品牌、研究项目与情报…" /><kbd>⌘ K</kbd></div>
          <div className="top-actions">
            <button className="icon-button" onClick={switchTheme} aria-label="Toggle theme">{dark ? <Sun size={20}/> : <Moon size={20}/>}</button>
            <button className="icon-button notification-button" onClick={() => setNotice('目前没有新的系统通知。')} aria-label="Notifications"><Notification size={20}/><i /></button>
            <div className="user-chip"><span className="user-avatar">S</span><span>Workspace</span><ChevronDown size={14}/></div>
          </div>
        </header>

        <div className="page-content">
          <div className="page-heading">
            <div><div className="eyebrow">SYNESIS / WORKSPACE</div><h1>{activeTitle}</h1><p>全球商业数据 · 跨平台情报 · AI 驱动研究</p></div>
            <div className="heading-actions"><Tag type="blue">个人工作空间</Tag><Button kind="primary" renderIcon={Add} onClick={() => setNotice('研究项目创建流程将在下一阶段接入。')}>新建研究项目</Button></div>
          </div>

          {notice && <InlineNotification kind="info" lowContrast title="提示" subtitle={notice} onCloseButtonClick={() => setNotice('')} />}

          {page === 'ai-models' ? (
            <section className="section-stack">
              <div className="section-intro"><div><h2>AI Provider 连接</h2><p>由你填写各服务的 API Key。凭证将通过后端安全接口保存，不会写入浏览器存储。</p></div><Tag type="cool-gray">BYOK · Bring Your Own Key</Tag></div>
              <InlineNotification kind="warning" lowContrast title="安全接入阶段" subtitle="当前为前端配置界面原型。后端加密凭证存储、用户身份验证和连通性测试完成前，保存操作不会发送或持久化任何密钥。" hideCloseButton />
              <div className="provider-grid">
                {providers.map(provider => <Tile key={provider.name} className="provider-tile">
                  <div className="provider-top"><BrandIcon slug={provider.slug} label={provider.name} fallback={provider.fallback} size={36}/><div><h3>{provider.name}</h3><span>API Provider</span></div><Tag type="cool-gray">未连接</Tag></div>
                  <div className="provider-form">
                    <TextInput id={`key-${provider.slug}`} type={showKey[provider.slug] ? 'text' : 'password'} labelText="API Key" placeholder="填写你的 API Key" value={apiKeys[provider.slug] ?? ''} onChange={e => setApiKeys(v => ({ ...v, [provider.slug]: e.target.value }))} autoComplete="off"/>
                    <div className="key-actions"><Button kind="ghost" size="sm" onClick={() => setShowKey(v => ({ ...v, [provider.slug]: !v[provider.slug] }))}>{showKey[provider.slug] ? '隐藏' : '显示'}</Button><Button kind="tertiary" size="sm" onClick={() => saveKey(provider.name)} disabled={!apiKeys[provider.slug]?.trim()}>保存并验证</Button></div>
                  </div>
                </Tile>)}
              </div>
              <Tile className="provider-tile cloudflare-tile">
                <div className="provider-top"><BrandIcon slug="cloudflare" label="Cloudflare" fallback="C" size={36}/><div><h3>Cloudflare Workers AI</h3><span>AI Runtime · AI Gateway</span></div><Tag type="cool-gray">待配置</Tag></div>
                <div className="cloudflare-fields"><TextInput id="cf-account" labelText="Cloudflare Account ID" placeholder="Account ID"/><TextInput id="cf-token" type="password" labelText="Cloudflare API Token" placeholder="填写 Cloudflare API Token" autoComplete="off"/></div>
                <p className="helper-text">Cloudflare 凭证与模型 Provider Key 分开管理；正式接入时只授予必要权限。</p>
              </Tile>
            </section>
          ) : page === 'dashboard' ? (
            <DashboardPage />
          ) : page === 'platforms' ? (
            <section className="section-stack"><div className="section-intro"><div><h2>平台数据中心</h2><p>每个平台独立管理商品、评论、关键词、排名及竞争者数据。</p></div><Tag type="blue">9 个平台模块</Tag></div><div className="platform-grid">{platforms.map(p => <Tile key={p.name} className="platform-tile"><BrandIcon slug={p.slug} label={p.name} fallback={p.fallback} size={34}/><div><h3>{p.name}</h3><p>数据模块 · 待接入</p></div><ChevronRight size={18}/></Tile>)}</div></section>
          ) : (
            <section className="empty-module"><div className="empty-icon"><Folder size={28}/></div><h2>{activeTitle}</h2><p>模块边界和主导航已建立。此业务模块将在后续迭代中独立开发、测试和接入。</p><Tag type="cool-gray">模块骨架已建立</Tag></section>
          )}

          <footer className="app-footer"><span>Synesis v0.1.0</span><span>Built on IBM Carbon Design System</span><span>Platform icons · Provider icons · API registry</span></footer>
        </div>
      </main>
    </div>
  );
}

function DashboardPage() {
  return <>
    <div className="kpi-grid">
      <Kpi icon={<Folder size={22}/>} label="研究项目" value="—" note="等待建立首个项目" tone="blue"/>
      <Kpi icon={<DataBase size={22}/>} label="追踪商品" value="—" note="平台数据尚未接入" tone="teal"/>
      <Kpi icon={<Analytics size={22}/>} label="市场信号" value="—" note="等待数据采集" tone="purple"/>
      <Kpi icon={<Task size={22}/>} label="运行任务" value="0" note="暂无执行中的任务" tone="green"/>
    </div>
    <div className="dashboard-grid">
      <Tile className="panel market-panel"><div className="panel-heading"><div><h2><Globe size={18}/> 全球市场活动</h2><p>跨平台市场情报覆盖区域</p></div><Tag type="blue">数据接入后启用</Tag></div><div className="world-placeholder"><div className="world-grid"/><div className="world-copy"><Globe size={42}/><strong>Global Intelligence Layer</strong><span>等待首批平台数据进入 Synesis</span></div></div></Tile>
      <Tile className="panel ai-panel"><div className="panel-heading"><div><h2><WatsonHealth size={18}/> AI 智能中心</h2><p>多模型服务连接状态</p></div><Tag type="cool-gray">配置中</Tag></div><div className="provider-mini-grid">{providers.slice(0,5).map(p => <div key={p.name}><BrandIcon slug={p.slug} label={p.name} fallback={p.fallback} size={28}/><span>{p.name.replace('Google ', '')}</span></div>)}</div><div className="panel-bottom-note">填写 API Key 后启用模型连接与智能路由</div></Tile>
      <Tile className="panel trend-panel"><div className="panel-heading"><div><h2><ChartLine size={18}/> 市场趋势</h2><p>历史趋势分析 · 按平台比较</p></div><Tag type="cool-gray">暂无数据</Tag></div><div className="chart-placeholder"><div className="chart-lines"><span/><span/><span/><span/></div><div className="chart-empty">采集数据后生成趋势分析</div></div></Tile>
      <Tile className="panel connections-panel"><div className="panel-heading"><div><h2><Api size={18}/> 数据连接</h2><p>项目基础设施与外部服务</p></div></div>{services.map(s => <div className="connection-row" key={s.name}><BrandIcon slug={s.slug} label={s.name} fallback={s.fallback} size={23}/><span>{s.name}</span><Tag type="cool-gray">待接入</Tag></div>)}</Tile>
    </div>
    <div className="panel-heading recent-heading"><div><h2><Document size={18}/> 最近研究项目</h2><p>研究项目中心创建后显示在这里</p></div><Button kind="ghost" size="sm" renderIcon={ArrowRight}>查看全部</Button></div>
    <Tile className="empty-table"><Folder size={26}/><span>尚未创建研究项目</span><small>建立研究项目，开始组织跨平台采集与市场分析。</small></Tile>
  </>;
}

function Kpi({ icon, label, value, note, tone }: { icon: React.ReactNode; label: string; value: string; note: string; tone: string }) {
  return <Tile className="kpi-card"><div className={`kpi-icon ${tone}`}>{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></Tile>;
}

export default App;