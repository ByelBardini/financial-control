import { useState } from 'react';
import type { MenuAnchor } from '../components/transacoes/NewTransactionMenu';
import type { TransactionDirection } from '../types/transacoes';

export type TransactionFormState =
  | { mode: 'create'; direction: TransactionDirection }
  | { mode: 'edit'; id: string };

// Orquestra o lançamento de transação (criar/editar) compartilhado entre telas: o estado do
// mini menu (popover desktop, ancorado) e o do modal de form. O sentido é escolhido no menu
// (`pick`) e abre a criação; `openEdit` abre a edição. As telas renderizam o NewTransactionMenu
// (desktop) e o TransactionFormModal a partir deste estado — o hook não emite JSX.
export function useTransactionEntry() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<MenuAnchor | undefined>(undefined);
  const [form, setForm] = useState<TransactionFormState | null>(null);

  const openMenu = (anchor?: MenuAnchor) => {
    if (anchor) setMenuAnchor(anchor);
    setMenuOpen(true);
  };
  const closeMenu = () => setMenuOpen(false);
  const openCreate = (direction: TransactionDirection) => setForm({ mode: 'create', direction });
  const openEdit = (id: string) => setForm({ mode: 'edit', id });
  const closeForm = () => setForm(null);

  // Escolher o sentido no menu fecha o popover e abre o modal de criação.
  const pick = (direction: TransactionDirection) => {
    setMenuOpen(false);
    openCreate(direction);
  };

  return { menuOpen, menuAnchor, form, openMenu, closeMenu, openCreate, openEdit, closeForm, pick };
}
