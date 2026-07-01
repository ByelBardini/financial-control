import { ModalSheet, apiErrorMessage } from '../ModalSheet';
import { SectionError } from '../SectionError';
import { SectionSkeleton } from '../SectionSkeleton';
import { TransferForm } from './TransferForm';
import { useAccounts } from '../../hooks/useDashboardQueries';
import { useCreateTransfer } from '../../hooks/useTransferMutations';
import {
  initialTransferValues,
  toCreateTransferInput,
  type TransferFormValues,
} from '../../lib/transferForm';

type TransferModalProps = {
  onClose: () => void;
  lockedDestinationId?: string; // pagar fatura → trava o destino na conta do cartão
  defaultAmountCents?: number; // pagar fatura → valor sugerido = fatura atual
  defaultOriginId?: string; // tocar numa conta → pré-seleciona a origem (não trava)
};

// Data de hoje no fuso local como YYYY-MM-DD (default do campo Data).
function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Modal (overlay) de transferência entre contas. Dois usos com o MESMO componente: "Transferir"
// (pickers livres) e "Pagar fatura" (destino travado na conta do cartão + valor = fatura atual).
// Carrega as contas, monta a mutation e fecha no sucesso. A invalidação atualiza saldo e o detalhe
// do cartão (a fatura cai / o limite volta).
export function TransferModal({
  onClose,
  lockedDestinationId,
  defaultAmountCents,
  defaultOriginId,
}: TransferModalProps) {
  const accountsQ = useAccounts();
  const createMut = useCreateTransfer();
  const title = lockedDestinationId ? 'Pagar fatura' : 'Transferir';
  const serverError = apiErrorMessage(createMut.error);

  function handleSubmit(values: TransferFormValues) {
    createMut.mutate(toCreateTransferInput(values), { onSuccess: onClose });
  }

  return (
    <ModalSheet title={title} onClose={onClose}>
      {renderBody()}
    </ModalSheet>
  );

  function renderBody() {
    if (accountsQ.isPending) return <SectionSkeleton />;
    if (accountsQ.isError)
      return <SectionError label="as contas" onRetry={() => void accountsQ.refetch()} />;

    const initial: TransferFormValues = {
      ...initialTransferValues(todayISO()),
      originAccountId: defaultOriginId ?? '',
      destinationAccountId: lockedDestinationId ?? '',
      amountCents: defaultAmountCents ?? 0,
    };
    return (
      <TransferForm
        initial={initial}
        accounts={accountsQ.data ?? []}
        lockDestination={lockedDestinationId != null}
        submitting={createMut.isPending}
        serverError={serverError}
        onSubmit={handleSubmit}
      />
    );
  }
}
