import { DesktopTransacoes } from '../components/desktop/DesktopTransacoes';
import { MobileTransacoes } from '../components/MobileTransacoes';
import { useHideValues } from '../hooks/useHideValues';
import { useIsDesktop } from '../hooks/useIsDesktop';
import type { AppRoute } from '../navigation/routes';

type TransacoesScreenProps = {
  route?: AppRoute;
  onNavigate?: (route: AppRoute) => void;
  onLogout?: () => void;
};

// Tela de Transações: escolhe o layout (desktop vs mobile), compartilha a máscara de
// ocultar valores e repassa a navegação. Read-only nesta passada (sem modal de
// cadastro); os dados vêm por hook React Query, servidos do mock em src/api/transacoes.
export function TransacoesScreen({
  route = 'transacoes',
  onNavigate,
  onLogout,
}: TransacoesScreenProps) {
  const { hidden, toggle } = useHideValues();
  const isDesktop = useIsDesktop();

  return isDesktop ? (
    <DesktopTransacoes
      hidden={hidden}
      onToggleHidden={toggle}
      route={route}
      onNavigate={onNavigate}
      onLogout={onLogout}
    />
  ) : (
    <MobileTransacoes
      hidden={hidden}
      onToggleHidden={toggle}
      route={route}
      onNavigate={onNavigate}
      onLogout={onLogout}
    />
  );
}
