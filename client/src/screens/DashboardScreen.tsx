import { DesktopDashboard } from '../components/desktop/DesktopDashboard';
import { MobileDashboard } from '../components/MobileDashboard';
import { useHideValues } from '../hooks/useHideValues';
import { useIsDesktop } from '../hooks/useIsDesktop';
import type { AppRoute } from '../navigation/routes';

type DashboardScreenProps = {
  route?: AppRoute;
  onNavigate?: (route: AppRoute) => void;
  onLogout?: () => void;
};

// Tela só decide o layout (desktop vs mobile) e compartilha o estado de máscara.
// Os dados são buscados por seção dentro de cada layout (React Query), não aqui.
// `onLogout` (opcional) é repassado pro layout expor o botão "Sair"; route/onNavigate
// alimentam a navegação interna (Side/Bottom nav).
export function DashboardScreen({
  route = 'dashboard',
  onNavigate,
  onLogout,
}: DashboardScreenProps) {
  const { hidden, toggle } = useHideValues();
  const isDesktop = useIsDesktop();

  return isDesktop ? (
    <DesktopDashboard
      hidden={hidden}
      onToggleHidden={toggle}
      route={route}
      onNavigate={onNavigate}
      onLogout={onLogout}
    />
  ) : (
    <MobileDashboard
      hidden={hidden}
      onToggleHidden={toggle}
      route={route}
      onNavigate={onNavigate}
      onLogout={onLogout}
    />
  );
}
