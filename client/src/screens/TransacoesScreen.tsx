import { DesktopTransacoes } from '../components/desktop/DesktopTransacoes';
import { MobileTransacoes } from '../components/MobileTransacoes';
import { useHideValues } from '../hooks/useHideValues';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { useTransactionFilters } from '../hooks/useTransactionFilters';
import type { AppRoute } from '../navigation/routes';

type TransacoesScreenProps = {
  route?: AppRoute;
  onNavigate?: (route: AppRoute) => void;
  onLogout?: () => void;
};

// Tela de Transações: escolhe o layout (desktop vs mobile), compartilha a máscara de
// ocultar valores e é DONA do controlador de filtros (período/categoria/busca), passado
// aos dois layouts — assim o filtro é o mesmo independente da plataforma. Read-only.
export function TransacoesScreen({
  route = 'transacoes',
  onNavigate,
  onLogout,
}: TransacoesScreenProps) {
  const { hidden, toggle } = useHideValues();
  const controls = useTransactionFilters();
  const isDesktop = useIsDesktop();

  return isDesktop ? (
    <DesktopTransacoes
      hidden={hidden}
      onToggleHidden={toggle}
      controls={controls}
      route={route}
      onNavigate={onNavigate}
      onLogout={onLogout}
    />
  ) : (
    <MobileTransacoes
      hidden={hidden}
      onToggleHidden={toggle}
      controls={controls}
      route={route}
      onNavigate={onNavigate}
      onLogout={onLogout}
    />
  );
}
