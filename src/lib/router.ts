import { useCallback, useEffect, useState } from 'react';

export type WorkspacePage = 'leads' | 'social' | 'global-leads' | 'vault';
export type WorkspaceRoute = { page: WorkspacePage };

function parseHash(): WorkspaceRoute {
  const parts = window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const page = parts[0];
  if (page === 'leads' || page === 'social' || page === 'global-leads' || page === 'vault') return { page };
  
  return { page: 'leads' };
}

function routeHash(route: WorkspaceRoute): string {
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

  const navigate = useCallback((page: WorkspacePage) => {
    const next = { page };
    const hash = routeHash(next);
    if (window.location.hash !== hash) window.history.pushState(null, '', hash);
    setRoute(next);
  }, []);

  return { ...route, navigate };
}
