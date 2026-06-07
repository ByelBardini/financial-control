import { DesktopDashboard } from '../components/desktop/DesktopDashboard';
import { MobileDashboard } from '../components/MobileDashboard';
import { useHideValues } from '../hooks/useHideValues';
import { useIsDesktop } from '../hooks/useIsDesktop';

type DashboardScreenProps = {
  onLogout?: () => void;
};

// Tela só decide o layout (desktop vs mobile) e compartilha o estado de máscara.
// Os dados são buscados por seção dentro de cada layout (React Query), não aqui.
// `onLogout` (opcional) é repassado pro layout expor o botão "Sair".
export function DashboardScreen({ onLogout }: DashboardScreenProps) {
  const { hidden, toggle } = useHideValues();
  const isDesktop = useIsDesktop();

  return isDesktop ? (
    <DesktopDashboard hidden={hidden} onToggleHidden={toggle} onLogout={onLogout} />
  ) : (
    <MobileDashboard hidden={hidden} onToggleHidden={toggle} onLogout={onLogout} />
  );
}
