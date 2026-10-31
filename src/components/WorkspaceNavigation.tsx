import { Dashboard, ChartLine, Product, SettingsAdjust } from '@carbon/icons-react';
import type { WorkspacePage } from '../lib/router';

type Props = { page: WorkspacePage; open: boolean; onNavigate: (page: WorkspacePage) => void; onClose: () => void };

export function WorkspaceNavigation({ page, open, onNavigate, onClose }: Props) {
  const items: { page: WorkspacePage; label: string; icon: typeof Dashboard }[] = [
    { page: 'dashboard', label: '情报总览', icon: Dashboard },
    { page: 'projects', label: '研究项目中心', icon: ChartLine },
    { page: 'products', label: '标准化商品库', icon: Product },
    { page: 'vault', label: 'AI 模型与 Key Vault', icon: SettingsAdjust },
  ];
  return <>
    <button className={`synesis-nav-backdrop${open ? ' is-visible' : ''}`} type="button" aria-label="关闭导航菜单" tabIndex={open ? 0 : -1} onClick={onClose} />
    <aside className={`synesis-nav-panel${open ? ' is-open' : ''}`} aria-label="Synesis 主导航" aria-hidden={!open}>
      <div className="synesis-nav-heading"><ChartLine size={20}/><span>跨境市场分析</span></div>
      <nav className="synesis-nav-tree" aria-label="跨境市场分析菜单">
        {items.map(({ page: target, label, icon: Icon }) => <button key={target} type="button" className={`synesis-nav-leaf synesis-nav-item${page === target ? ' is-active' : ''}`} onClick={() => onNavigate(target)}><Icon size={16}/><span>{label}</span></button>)}
      </nav>
    </aside>
  </>;
}
