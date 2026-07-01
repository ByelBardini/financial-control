import { useCallback, useState } from 'react';
import type { AppRoute } from './routes';

// Nativo (iOS/Android): sem barra de endereço — a rota é só estado local, igual ao
// comportamento original do AuthenticatedApp. A variante web (useUrlRoute.web.ts)
// espelha a rota na URL do browser. Ex.: const [route, navigate] = useUrlRoute().
export function useUrlRoute(): [AppRoute, (route: AppRoute) => void] {
  const [route, setRoute] = useState<AppRoute>('dashboard');
  const navigate = useCallback((next: AppRoute) => setRoute(next), []);
  return [route, navigate];
}
