import { useCallback, useEffect, useState } from 'react';

export type WorkspacePage = 'leads' | 'vault' | 'dashboard' | 'projects' | 'products' | 'settings';
export type WorkspaceRoute = { page: WorkspacePage; projectId?: string };

function parseHash(): WorkspaceRoute {
  const parts = window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const page = parts[0];
  if (page === 'research' && parts[1]) return { page: 'projects', projectId: decodeURIComponent(parts[1]) };
  if (page === 'leads' || page === 'vault') return { page };
  
  return { page: 'leads' };
}

function routeHash(route: WorkspaceRoute): string {
  if (route.page === 'projects' && route.projectId) return `#/research/${encodeURIComponent(route.projectId)}`;
  return `#/${route.page}`;
}

/** Hash routing keeps deep links and refreshes working on static Worker hosting without rewrite rules. */
export function useWorkspaceRoute() {
  const [route, setRoute] = useState<WorkspaceRoute>(() => parseHash());

  useEffect(() => {
    if (!window.location.hash) window.history.replaceState(null, '', routeHash({ page: 'leads' }));
    const sync = () => setRoute(parseHash());
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
    };
  }, []);

  const navigate = useCallback((page: WorkspacePage, projectId?: string) => {
    const next = { page, projectId };
    const hash = routeHash(next);
    if (window.location.hash !== hash) window.history.pushState(null, '', hash);
    setRoute(next);
  }, []);

  return { ...route, navigate };
}
