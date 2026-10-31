import { useEffect, useRef } from 'react';
import { Dashboard, ChartLine, Product, SettingsAdjust, Key } from '@carbon/icons-react';
import type { WorkspacePage } from '../lib/router';

type Props = { page: WorkspacePage; open: boolean; onNavigate: (page: WorkspacePage) => void; onClose: () => void };

export function WorkspaceNavigation({ page, open, onNavigate, onClose }: Props) {
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const items: { page: WorkspacePage; label: string; icon: typeof Dashboard }[] = [
    { page: 'dashboard', label: '情报总览', icon: Dashboard },
    { page: 'projects', label: '研究项目中心', icon: ChartLine },
    { page: 'products', label: '标准化商品库', icon: Product },
    { page: 'settings', label: '调研采集设置', icon: SettingsAdjust },
    { page: 'vault', label: 'AI 模型与 Key Vault', icon: Key },
  ];

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => firstLinkRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      document.querySelector<HTMLButtonElement>('.cds--header__menu-trigger')?.focus();
    };
  }, [open]);

  return <>
    <button
      className={`synesis-nav-backdrop${open ? ' is-visible' : ''}`}
      type="button"
      aria-label="关闭导航菜单"
      tabIndex={-1}
      onClick={onClose}
    />
    <aside
      className={`synesis-nav-panel${open ? ' is-open' : ''}`}
      aria-label="Synesis 主导航"
      aria-hidden={!open}
      inert={!open}
    >
      <div className="synesis-nav-heading"><ChartLine size={20}/><span>跨境市场分析</span></div>
      <nav className="synesis-nav-tree" aria-label="跨境市场分析菜单">
        {items.map(({ page: target, label, icon: Icon }, index) => (
          <a
            key={target}
            ref={index === 0 ? firstLinkRef : undefined}
            href={target === 'projects' ? '#/projects' : `#/${target}`}
            className={`synesis-nav-leaf synesis-nav-item${page === target ? ' is-active' : ''}`}
            aria-current={page === target ? 'page' : undefined}
            onClick={event => {
              event.preventDefault();
              onNavigate(target);
            }}
          >
            <Icon size={16}/>
            <span>{label}</span>
          </a>
        ))}
      </nav>
    </aside>
  </>;
}
