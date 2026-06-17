import { DesktopTransacoes } from '../components/desktop/DesktopTransacoes';
import { MobileTransacoes } from '../components/MobileTransacoes';
import { NewTransactionMenu } from '../components/transacoes/NewTransactionMenu';
import { TransactionFormModal } from '../components/transacoes/TransactionFormModal';
import { useHideValues } from '../hooks/useHideValues';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { useTransactionEntry } from '../hooks/useTransactionEntry';
import { useTransactionFilters } from '../hooks/useTransactionFilters';
import type { AppRoute } from '../navigation/routes';

type TransacoesScreenProps = {
  route?: AppRoute;
  onNavigate?: (route: AppRoute) => void;
  onLogout?: () => void;
};

// Tela de Transações: escolhe o layout (desktop vs mobile), compartilha a máscara e hospeda o
// lançamento (criar/editar) via useTransactionEntry. O sentido é escolhido no mini menu (popover
// desktop / speed dial mobile) e a escolha abre o modal já com Despesa/Receita; tocar numa linha
// abre o editar. O modal invalida e atualiza as telas no sucesso.
export function TransacoesScreen({
  route = 'transacoes',
  onNavigate,
  onLogout,
}: TransacoesScreenProps) {
  const { hidden, toggle } = useHideValues();
  const controls = useTransactionFilters();
  const isDesktop = useIsDesktop();
  const { menuOpen, menuAnchor, form, openMenu, closeMenu, openCreate, openEdit, closeForm, pick } =
    useTransactionEntry();

  const layout = isDesktop ? (
    <>
      <DesktopTransacoes
        hidden={hidden}
        onToggleHidden={toggle}
        controls={controls}
        route={route}
        onNavigate={onNavigate}
        onLogout={onLogout}
        onCreateTransaction={openMenu}
        onEditTransaction={openEdit}
      />
      <NewTransactionMenu
        visible={menuOpen}
        anchor={menuAnchor}
        onPick={pick}
        onClose={closeMenu}
      />
    </>
  ) : (
    <MobileTransacoes
      hidden={hidden}
      onToggleHidden={toggle}
      controls={controls}
      route={route}
      onNavigate={onNavigate}
      onLogout={onLogout}
      onCreateTransaction={openCreate}
      onEditTransaction={openEdit}
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
