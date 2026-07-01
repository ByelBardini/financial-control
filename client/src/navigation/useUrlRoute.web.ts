import { useCallback, useEffect, useState } from 'react';
import { pathToRoute, routeToPath } from './routePath';
import type { AppRoute } from './routes';

// Web: espelha a rota na URL do browser (History API). O estado inicial vem do pathname
// (deep link/refresh cai na tela certa), navigate faz pushState e popstate (voltar/avançar)
// re-deriva a rota. Sem window (SSR) cai em 'dashboard'. A variante nativa
// (useUrlRoute.ts) é só estado local. Ex.: const [route, navigate] = useUrlRoute().
export function useUrlRoute(): [AppRoute, (route: AppRoute) => void] {
  const [route, setRoute] = useState<AppRoute>(readRoute);

  const navigate = useCallback((next: AppRoute) => {
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', routeToPath(next));
    }
    setRoute(next);
  }, []);

  useEffect(() => subscribeToPopState(setRoute), []);

  return [route, navigate];
}

function readRoute(): AppRoute {
  if (typeof window === 'undefined') return 'dashboard';
  return pathToRoute(window.location.pathname);
}

function subscribeToPopState(onChange: (route: AppRoute) => void): () => void {
  const handler = () => onChange(readRoute());
  window.addEventListener('popstate', handler);
  return () => window.removeEventListener('popstate', handler);
}
