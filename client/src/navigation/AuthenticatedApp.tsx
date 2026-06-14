import { useState } from 'react';
import { ContasScreen } from '../screens/ContasScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { TransacoesScreen } from '../screens/TransacoesScreen';
import type { AppRoute } from './routes';

type AuthenticatedAppProps = {
  onLogout?: () => void;
};

// Área autenticada: alterna entre Dashboard, Transações e Contas via estado local (sem
// lib de routing), espelhando o toggle login/criar-conta do RootNavigator. route +
// setRoute descem pra navegação (Side/Bottom nav) destacar o destino atual e trocar de tela.
export function AuthenticatedApp({ onLogout }: AuthenticatedAppProps) {
  const [route, setRoute] = useState<AppRoute>('dashboard');

  if (route === 'contas') {
    return <ContasScreen route={route} onNavigate={setRoute} onLogout={onLogout} />;
  }
  if (route === 'transacoes') {
    return <TransacoesScreen route={route} onNavigate={setRoute} onLogout={onLogout} />;
  }
  return <DashboardScreen route={route} onNavigate={setRoute} onLogout={onLogout} />;
}
