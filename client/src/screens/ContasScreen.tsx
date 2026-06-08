import { useState } from 'react';
import { AccountFormModal } from '../components/contas/AccountFormModal';
import { DesktopContas } from '../components/desktop/DesktopContas';
import { MobileContas } from '../components/MobileContas';
import { useHideValues } from '../hooks/useHideValues';
import { useIsDesktop } from '../hooks/useIsDesktop';
import type { AppRoute } from '../navigation/routes';

type ContasScreenProps = {
  route?: AppRoute;
  onNavigate?: (route: AppRoute) => void;
  onLogout?: () => void;
};

type FormState = { mode: 'create' | 'edit'; id?: string };

// Tela de Contas: escolhe o layout (desktop vs mobile), compartilha a máscara e é
// dona do estado do formulário (modal de criar/editar). Os layouts disparam
// onCreateAccount/onEditAccount; o sucesso da mutation invalida e atualiza as telas.
export function ContasScreen({ route = 'contas', onNavigate, onLogout }: ContasScreenProps) {
  const { hidden, toggle } = useHideValues();
  const isDesktop = useIsDesktop();
  const [form, setForm] = useState<FormState | null>(null);

  const openCreate = () => setForm({ mode: 'create' });
  const openEdit = (id: string) => setForm({ mode: 'edit', id });
  const closeForm = () => setForm(null);

  const layout = isDesktop ? (
    <DesktopContas
      hidden={hidden}
      onToggleHidden={toggle}
      route={route}
      onNavigate={onNavigate}
      onLogout={onLogout}
      onCreateAccount={openCreate}
      onEditAccount={openEdit}
    />
  ) : (
    <MobileContas
      hidden={hidden}
      onToggleHidden={toggle}
      route={route}
      onNavigate={onNavigate}
      onLogout={onLogout}
      onCreateAccount={openCreate}
      onEditAccount={openEdit}
    />
  );

  return (
    <>
      {layout}
      {form ? <AccountFormModal mode={form.mode} accountId={form.id} onClose={closeForm} /> : null}
    </>
  );
}
