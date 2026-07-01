import { pathToRoute, routeToPath } from '../../src/navigation/routePath';
import type { AppRoute } from '../../src/navigation/routes';

const ALL_ROUTES: AppRoute[] = ['dashboard', 'contas', 'transacoes', 'investimentos'];

describe('routePath', () => {
  describe('routeToPath', () => {
    it('mapeia cada rota pro seu caminho (dashboard é a raiz)', () => {
      expect(routeToPath('dashboard')).toBe('/');
      expect(routeToPath('contas')).toBe('/contas');
      expect(routeToPath('transacoes')).toBe('/transacoes');
      expect(routeToPath('investimentos')).toBe('/investimentos');
    });
  });

  describe('pathToRoute', () => {
    it('mapeia cada caminho pra sua rota', () => {
      expect(pathToRoute('/')).toBe('dashboard');
      expect(pathToRoute('/contas')).toBe('contas');
      expect(pathToRoute('/transacoes')).toBe('transacoes');
      expect(pathToRoute('/investimentos')).toBe('investimentos');
    });

    it('ignora barra final', () => {
      expect(pathToRoute('/contas/')).toBe('contas');
    });

    it('cai em dashboard pra caminho vazio, desconhecido ou de auth', () => {
      expect(pathToRoute('')).toBe('dashboard');
      expect(pathToRoute('/desconhecido')).toBe('dashboard');
      expect(pathToRoute('/login')).toBe('dashboard');
    });
  });

  it('faz round-trip rota → caminho → rota pra toda rota', () => {
    for (const route of ALL_ROUTES) {
      expect(pathToRoute(routeToPath(route))).toBe(route);
    }
  });
});
