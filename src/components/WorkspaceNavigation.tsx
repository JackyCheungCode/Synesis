import { SideNav, SideNavItems, SideNavMenu, SideNavMenuItem } from '@carbon/react';
import { ChartLine, Dashboard, Key, Product, SettingsAdjust } from '@carbon/icons-react';
import type { WorkspacePage } from '../lib/router';

type Props = { page: WorkspacePage; open: boolean; onNavigate: (page: WorkspacePage) => void; onClose: () => void };

export function WorkspaceNavigation({ page, open, onNavigate, onClose }: Props) {
  const closeAndFocusTrigger = () => {
    onClose();
    window.requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('.cds--header__menu-trigger')?.focus());
  };
  const navigateAndFocusContent = (target: WorkspacePage) => {
    onNavigate(target);
    window.requestAnimationFrame(() => document.getElementById('main-content')?.focus());
  };
  const items: { page: WorkspacePage; label: string; icon: typeof Dashboard }[] = [
    { page: 'dashboard', label: '情报总览', icon: Dashboard },
    { page: 'projects', label: '研究项目中心', icon: ChartLine },
    { page: 'products', label: '标准化商品库', icon: Product },
    { page: 'settings', label: '调研采集设置', icon: SettingsAdjust },
    { page: 'vault', label: 'AI 模型与 Key Vault', icon: Key },
  ];

  return (
    <SideNav
      id="synesis-navigation"
      className="synesis-carbon-side-nav"
      aria-label="Synesis 主导航"
      expanded={open}
      isPersistent={false}
      onOverlayClick={closeAndFocusTrigger}
      onToggle={(event, value) => {
        if (!value) {
          if (typeof event !== 'boolean' && event.type === 'keydown') closeAndFocusTrigger();
          else onClose();
        }
      }}
    >
      <SideNavItems>
        <SideNavMenu
          title="跨境市场分析"
          renderIcon={ChartLine}
          defaultExpanded
          isActive={items.some(item => item.page === page)}
        >
          {items.map(({ page: target, label, icon: Icon }) => (
            <SideNavMenuItem
              key={target}
              href={target === 'projects' ? '#/projects' : `#/${target}`}
              isActive={page === target}
              aria-current={page === target ? 'page' : undefined}
              onClick={event => {
                event.preventDefault();
                navigateAndFocusContent(target);
              }}
            >
              <span className="synesis-carbon-nav-item"><Icon size={16} />{label}</span>
            </SideNavMenuItem>
          ))}
        </SideNavMenu>
      </SideNavItems>
    </SideNav>
  );
}
