import { useState } from 'react';
import { ContasScreen } from '../screens/ContasScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import type { AppRoute } from './routes';

type AuthenticatedAppProps = {
  onLogout?: () => void;
};

// Área autenticada: alterna entre Dashboard e Contas via estado local (sem lib de
// routing), espelhando o toggle login/criar-conta do RootNavigator. route + setRoute
// descem pra navegação (Side/Bottom nav) destacar o destino atual e trocar de tela.
export function AuthenticatedApp({ onLogout }: AuthenticatedAppProps) {
  const [route, setRoute] = useState<AppRoute>('dashboard');

  return route === 'contas' ? (
    <ContasScreen route={route} onNavigate={setRoute} onLogout={onLogout} />
  ) : (
    <DashboardScreen route={route} onNavigate={setRoute} onLogout={onLogout} />
  );
}
