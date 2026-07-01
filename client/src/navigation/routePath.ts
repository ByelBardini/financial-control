import type { AppRoute } from './routes';

// Mapa rota↔caminho do URL (web). 'dashboard' é a raiz '/'. Fonte única dos dois
// sentidos — Record<AppRoute, string> obriga a casar com AppRoute (routes.ts).
const ROUTE_TO_PATH: Record<AppRoute, string> = {
  dashboard: '/',
  contas: '/contas',
  transacoes: '/transacoes',
  investimentos: '/investimentos',
};

// Caminho do URL pra uma rota. Ex.: routeToPath('contas') === '/contas'.
export function routeToPath(route: AppRoute): string {
  return ROUTE_TO_PATH[route];
}

// Rota a partir do pathname do browser: tira barra final, casa pelo 1º segmento;
// '/', vazio ou desconhecido cai em 'dashboard'. Ex.: pathToRoute('/contas/') === 'contas'.
export function pathToRoute(pathname: string): AppRoute {
  const segment = pathname.replace(/\/+$/, '').split('/')[1] ?? '';
  const match = (Object.keys(ROUTE_TO_PATH) as AppRoute[]).find(
    (route) => ROUTE_TO_PATH[route] === `/${segment}`,
  );
  return match ?? 'dashboard';
}
