import { ModalSheet, apiErrorMessage } from '../ModalSheet';
import { SectionError } from '../SectionError';
import { SectionSkeleton } from '../SectionSkeleton';
import { TradeForm } from './TradeForm';
import { useAccounts } from '../../hooks/useDashboardQueries';
import { useAsset, useCreateTrade } from '../../hooks/useInvestmentMutations';
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

// Modal de COMPRA/VENDA (lado fixo). Carrega o ativo (preço atual + classe, cache quente do detalhe)
// pra pré-preencher o preço e decidir o modo (cripto abre "por valor") e as contas pro select de
// liquidação; monta a mutation e fecha no sucesso. Título "Comprar <ticker>"/"Vender <ticker>".
export function TradeModal({ assetId, ticker, side, onClose }: TradeModalProps) {
  const assetQ = useAsset(assetId);
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
    if (assetQ.isPending || accountsQ.isPending) return <SectionSkeleton />;
    if (assetQ.isError || accountsQ.isError)
      return (
        <SectionError
          label="a operação"
          onRetry={() => {
            void assetQ.refetch();
            void accountsQ.refetch();
          }}
        />
      );
    const asset = assetQ.data;
    if (!asset) return null;
    const accounts = accountsQ.data ?? [];
    const isCrypto = asset.assetClass === 'cripto';
    const initial = {
      ...initialTradeValues(side, todayISO(), asset.currentPriceCents, isCrypto),
      accountId: accounts[0]?.id ?? '',
    };
    return (
      <TradeForm
        ticker={ticker}
        isCrypto={isCrypto}
        initial={initial}
        accounts={accounts}
        submitting={submitting}
        serverError={serverError}
        onSubmit={handleSubmit}
      />
    );
  }
}
