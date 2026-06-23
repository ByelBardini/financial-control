import { ModalSheet, apiErrorMessage } from '../ModalSheet';
import { SectionError } from '../SectionError';
import { SectionSkeleton } from '../SectionSkeleton';
import { TradeForm } from './TradeForm';
import { useAccounts } from '../../hooks/useDashboardQueries';
import { useCreateTrade } from '../../hooks/useInvestmentMutations';
import {
  initialTradeValues,
  toCreateTradeInput,
  type TradeFormValues,
  type TradeSide,
} from '../../lib/investmentTradeForm';

type TradeModalProps = {
  assetId: string;
  ticker: string;
  side: TradeSide;
  onClose: () => void;
};

// Data de hoje no fuso local como YYYY-MM-DD (default do campo Data — evita o shift do toISOString).
function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Modal de COMPRA/VENDA (lado fixo). Carrega as contas pro select de liquidação, monta a mutation
// e fecha no sucesso. Título "Comprar <ticker>" / "Vender <ticker>". Casca via ModalSheet.
export function TradeModal({ assetId, ticker, side, onClose }: TradeModalProps) {
  const accountsQ = useAccounts();
  const createMut = useCreateTrade();

  const submitting = createMut.isPending;
  const serverError = apiErrorMessage(createMut.error);

  function handleSubmit(values: TradeFormValues) {
    createMut.mutate({ assetId, input: toCreateTradeInput(values) }, { onSuccess: onClose });
  }

  return (
    <ModalSheet title={side === 'buy' ? `Comprar ${ticker}` : `Vender ${ticker}`} onClose={onClose}>
      {renderBody()}
    </ModalSheet>
  );

  function renderBody() {
    if (accountsQ.isPending) return <SectionSkeleton />;
    if (accountsQ.isError)
      return <SectionError label="as contas" onRetry={() => void accountsQ.refetch()} />;
    const accounts = accountsQ.data ?? [];
    const initial = { ...initialTradeValues(side, todayISO()), accountId: accounts[0]?.id ?? '' };
    return (
      <TradeForm
        ticker={ticker}
        initial={initial}
        accounts={accounts}
        submitting={submitting}
        serverError={serverError}
        onSubmit={handleSubmit}
      />
    );
  }
}
