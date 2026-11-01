import type { MouseEvent } from 'react';
import {
  Key,
  SearchIcon,
  SideNav,
  SideNavItems,
  SideNavLink,
  SideNavMenu,
  SideNavMenuItem,
} from './carbon';
import type { WorkspacePage } from '../lib/router';

type Props = {
  page: WorkspacePage;
  open: boolean;
  onNavigate: (page: WorkspacePage) => void;
  onClose: () => void;
};

export function WorkspaceNavigation({ page, open, onNavigate, onClose }: Props) {
  const navigate = (target: WorkspacePage) => (event: MouseEvent) => {
    event.preventDefault();
    onNavigate(target);
    onClose();
    window.requestAnimationFrame(() => document.getElementById('main-content')?.focus());
  };

  return (
    <SideNav
      id="synesis-navigation"
      aria-label="主导航"
      aria-hidden={!open}
      expanded={open}
      isChildOfHeader
      isFixedNav={false}
      onOverlayClick={onClose}
    >
      <SideNavItems>
        <SideNavMenu
          title="全球客户发现"
          renderIcon={SearchIcon}
          defaultExpanded
        >
          <SideNavMenuItem href="#/leads" isActive={page === 'leads'} onClick={navigate('leads')}>
            Import Export Leads Finder
          </SideNavMenuItem>
          <SideNavMenuItem href="#/social" isActive={page === 'social'} onClick={navigate('social')}>
            Social Leads Finder
          </SideNavMenuItem>
          <SideNavMenuItem href="#/global-leads" isActive={page === 'global-leads'} onClick={navigate('global-leads')}>
            全球客户线索库
          </SideNavMenuItem>
        </SideNavMenu>
        <SideNavLink
          href="#/vault"
          renderIcon={Key}
          isActive={page === 'vault'}
          onClick={navigate('vault')}
        >
          API 与 AI 配置
        </SideNavLink>
      </SideNavItems>
    </SideNav>
  );
}
