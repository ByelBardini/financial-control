import { DesktopDashboard } from '../components/desktop/DesktopDashboard';
import { MobileDashboard } from '../components/MobileDashboard';
import { NewTransactionMenu } from '../components/transacoes/NewTransactionMenu';
import { TransactionFormModal } from '../components/transacoes/TransactionFormModal';
import { useHideValues } from '../hooks/useHideValues';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { useTransactionEntry } from '../hooks/useTransactionEntry';
import type { AppRoute } from '../navigation/routes';

type DashboardScreenProps = {
  route?: AppRoute;
  onNavigate?: (route: AppRoute) => void;
  onLogout?: () => void;
};

// Tela só decide o layout (desktop vs mobile) e compartilha o estado de máscara. Os dados são
// buscados por seção dentro de cada layout (React Query), não aqui. `onLogout` (opcional) é
// repassado pro layout expor o botão "Sair"; route/onNavigate alimentam a navegação interna.
// Também hospeda a criação de transação (só criar) via useTransactionEntry: no desktop o botão do
// header abre o mini menu (popover), no mobile o speed dial — a escolha do sentido abre o modal.
export function DashboardScreen({
  route = 'dashboard',
  onNavigate,
  onLogout,
}: DashboardScreenProps) {
  const { hidden, toggle } = useHideValues();
  const isDesktop = useIsDesktop();
  const { menuOpen, menuAnchor, form, openMenu, closeMenu, openCreate, closeForm, pick } =
    useTransactionEntry();

  const layout = isDesktop ? (
    <>
      <DesktopDashboard
        hidden={hidden}
        onToggleHidden={toggle}
        route={route}
        onNavigate={onNavigate}
        onLogout={onLogout}
        onCreate={openMenu}
      />
      <NewTransactionMenu
        visible={menuOpen}
        anchor={menuAnchor}
        onPick={pick}
        onClose={closeMenu}
      />
    </>
  ) : (
    <MobileDashboard
      hidden={hidden}
      onToggleHidden={toggle}
      route={route}
      onNavigate={onNavigate}
      onLogout={onLogout}
      onCreateTransaction={openCreate}
    />
  );

  return (
    <>
      {layout}
      {form ? (
        <TransactionFormModal
          mode={form.mode}
          direction={form.mode === 'create' ? form.direction : undefined}
          transactionId={form.mode === 'edit' ? form.id : undefined}
          onClose={closeForm}
        />
      ) : null}
    </>
  );
}
