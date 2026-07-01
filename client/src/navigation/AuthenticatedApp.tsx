import { ContasScreen } from '../screens/ContasScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { InvestimentosScreen } from '../screens/InvestimentosScreen';
import { TransacoesScreen } from '../screens/TransacoesScreen';
import { useUrlRoute } from './useUrlRoute';

type AuthenticatedAppProps = {
  onLogout?: () => void;
};

// Área autenticada: alterna entre Dashboard, Transações, Contas e Investimentos. A rota mora no
// useUrlRoute — na web ela é espelhada na URL do browser (/contas, /transacoes…) via History API;
// no nativo é só estado local. route + navigate descem pra navegação (Side/Bottom nav). O
// lançamento de transação é um MODAL dono da própria tela (TransacoesScreen), não uma rota.
export function AuthenticatedApp({ onLogout }: AuthenticatedAppProps) {
  const [route, navigate] = useUrlRoute();

  if (route === 'contas') {
    return <ContasScreen route={route} onNavigate={navigate} onLogout={onLogout} />;
  }
  if (route === 'transacoes') {
    return <TransacoesScreen route={route} onNavigate={navigate} onLogout={onLogout} />;
  }
  if (route === 'investimentos') {
    return <InvestimentosScreen route={route} onNavigate={navigate} onLogout={onLogout} />;
  }
  return <DashboardScreen route={route} onNavigate={navigate} onLogout={onLogout} />;
}
