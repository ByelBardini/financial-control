import { DesktopDashboard } from '../components/desktop/DesktopDashboard';
import { MobileDashboard } from '../components/MobileDashboard';
import { useHideValues } from '../hooks/useHideValues';
import { useIsDesktop } from '../hooks/useIsDesktop';

// Tela só decide o layout (desktop vs mobile) e compartilha o estado de máscara.
// Os dados são buscados por seção dentro de cada layout (React Query), não aqui.
export function DashboardScreen() {
  const { hidden, toggle } = useHideValues();
  const isDesktop = useIsDesktop();

  return isDesktop ? (
    <DesktopDashboard hidden={hidden} onToggleHidden={toggle} />
  ) : (
    <MobileDashboard hidden={hidden} onToggleHidden={toggle} />
  );
}
