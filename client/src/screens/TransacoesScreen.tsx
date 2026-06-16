import { useState } from 'react';
import { DesktopTransacoes } from '../components/desktop/DesktopTransacoes';
import { MobileTransacoes } from '../components/MobileTransacoes';
import { NewTransactionMenu, type MenuAnchor } from '../components/transacoes/NewTransactionMenu';
import { TransactionFormModal } from '../components/transacoes/TransactionFormModal';
import { useHideValues } from '../hooks/useHideValues';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { useTransactionFilters } from '../hooks/useTransactionFilters';
import type { AppRoute } from '../navigation/routes';
import type { TransactionDirection } from '../types/transacoes';

type TransacoesScreenProps = {
  route?: AppRoute;
  onNavigate?: (route: AppRoute) => void;
  onLogout?: () => void;
};

type FormState = { mode: 'create'; direction: TransactionDirection } | { mode: 'edit'; id: string };

// Tela de Transações: escolhe o layout (desktop vs mobile), compartilha a máscara e é DONA do
// estado do form (modal de criar/editar — como a ContasScreen). O sentido é escolhido no mini
// menu (popover desktop / speed dial mobile) e a escolha abre o modal já com Despesa/Receita;
// tocar numa linha abre o editar. O modal invalida e atualiza as telas no sucesso.
export function TransacoesScreen({
  route = 'transacoes',
  onNavigate,
  onLogout,
}: TransacoesScreenProps) {
  const { hidden, toggle } = useHideValues();
  const controls = useTransactionFilters();
  const isDesktop = useIsDesktop();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<MenuAnchor | undefined>(undefined);
  const [form, setForm] = useState<FormState | null>(null);

  const openMenu = (anchor?: MenuAnchor) => {
    if (anchor) setMenuAnchor(anchor);
    setMenuOpen(true);
  };
  const openCreate = (direction: TransactionDirection) => setForm({ mode: 'create', direction });
  const openEdit = (id: string) => setForm({ mode: 'edit', id });
  const closeForm = () => setForm(null);

  // Escolher o sentido (no popover desktop) fecha o menu e abre o modal de criação.
  const pick = (direction: TransactionDirection) => {
    setMenuOpen(false);
    openCreate(direction);
  };

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
        onClose={() => setMenuOpen(false)}
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
