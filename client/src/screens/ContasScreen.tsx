import { useState } from 'react';
import { AccountFormModal } from '../components/contas/AccountFormModal';
import { CardDetailModal } from '../components/contas/CardDetailModal';
import { LancarFaturaModal } from '../components/contas/LancarFaturaModal';
import { TransferModal } from '../components/contas/TransferModal';
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

// União discriminada do overlay aberto. Tocar num cartão abre 'cardDetail' (não mais o form de
// editar); a engrenagem do detalhe transita pra 'editAccount'; os botões do detalhe transitam pra
// 'lancarFatura' / 'payInvoice'. 'transfer' é a transferência livre entre contas. Só um overlay por
// vez; null = nenhum.
type ModalState =
  | { kind: 'create' }
  | { kind: 'editAccount'; id: string }
  | { kind: 'cardDetail'; id: string }
  | { kind: 'lancarFatura'; cardId: string }
  | { kind: 'payInvoice'; cardId: string; invoiceCents: number }
  | { kind: 'transfer'; originId?: string };

// Tela de Contas: escolhe o layout (desktop vs mobile), compartilha a máscara e é dona do estado
// dos overlays. Os layouts disparam criar conta / abrir cartão / editar conta (bancos e vales ainda
// editam direto). O sucesso das mutations invalida e atualiza as telas (QueryClient compartilhado).
export function ContasScreen({ route = 'contas', onNavigate, onLogout }: ContasScreenProps) {
  const { hidden, toggle } = useHideValues();
  const isDesktop = useIsDesktop();
  const [modal, setModal] = useState<ModalState | null>(null);

  const openCreate = () => setModal({ kind: 'create' });
  const openEdit = (id: string) => setModal({ kind: 'editAccount', id });
  const openCard = (id: string) => setModal({ kind: 'cardDetail', id });
  const openTransfer = () => setModal({ kind: 'transfer' });
  const openTransferFrom = (originId: string) => setModal({ kind: 'transfer', originId });
  const close = () => setModal(null);

  const layoutProps = {
    hidden,
    onToggleHidden: toggle,
    route,
    onNavigate,
    onLogout,
    onCreateAccount: openCreate,
    onEditAccount: openEdit,
    onOpenCard: openCard,
    onTransfer: openTransfer,
    onTransferFrom: openTransferFrom,
  };

  const layout = isDesktop ? <DesktopContas {...layoutProps} /> : <MobileContas {...layoutProps} />;

  return (
    <>
      {layout}
      {modal?.kind === 'create' ? <AccountFormModal mode="create" onClose={close} /> : null}
      {modal?.kind === 'editAccount' ? (
        <AccountFormModal mode="edit" accountId={modal.id} onClose={close} />
      ) : null}
      {modal?.kind === 'cardDetail' ? (
        <CardDetailModal
          cardId={modal.id}
          onClose={close}
          onEdit={() => setModal({ kind: 'editAccount', id: modal.id })}
          onLancar={() => setModal({ kind: 'lancarFatura', cardId: modal.id })}
          onPagar={(invoiceCents) =>
            setModal({ kind: 'payInvoice', cardId: modal.id, invoiceCents })
          }
        />
      ) : null}
      {modal?.kind === 'lancarFatura' ? (
        <LancarFaturaModal cardId={modal.cardId} onClose={close} />
      ) : null}
      {modal?.kind === 'payInvoice' ? (
        <TransferModal
          lockedDestinationId={modal.cardId}
          defaultAmountCents={modal.invoiceCents}
          onClose={close}
        />
      ) : null}
      {modal?.kind === 'transfer' ? (
        <TransferModal defaultOriginId={modal.originId} onClose={close} />
      ) : null}
    </>
  );
}
