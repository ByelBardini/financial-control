import { DesktopDashboard } from '../components/desktop/DesktopDashboard';
import { MobileDashboard } from '../components/MobileDashboard';
import { useDashboardData } from '../hooks/useDashboardData';
import { useHideValues } from '../hooks/useHideValues';
import { useIsDesktop } from '../hooks/useIsDesktop';

// Tela só decide o layout (desktop vs mobile) e injeta dados + estado de máscara.
// Dados via useDashboardData (seam); estado de ocultar valores compartilhado.
export function DashboardScreen() {
  const { data } = useDashboardData();
  const { hidden, toggle } = useHideValues();
  const isDesktop = useIsDesktop();

  return isDesktop ? (
    <DesktopDashboard data={data} hidden={hidden} onToggleHidden={toggle} />
  ) : (
    <MobileDashboard data={data} hidden={hidden} onToggleHidden={toggle} />
  );
}
