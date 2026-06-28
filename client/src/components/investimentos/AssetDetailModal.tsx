import { Pressable, Text, View } from 'react-native';
import { AssetHistorySection } from './AssetHistorySection';
import { ModalSheet } from '../ModalSheet';
import { SectionError } from '../SectionError';
import { SectionSkeleton } from '../SectionSkeleton';
import { Icon } from '../Icon';
import { MoneyText } from '../MoneyText';
import { useAsset, useDeleteTrade } from '../../hooks/useInvestmentMutations';
import { changeTone, formatPercent } from '../../lib/percent';
import { formatBRL } from '../../lib/money';
import { toneColor } from '../../theme/colors';
import type { TradeSide } from '../../lib/investmentTradeForm';
import type { Trade } from '../../types/investimentos';

type AssetDetailModalProps = {
  assetId: string;
  onClose: () => void;
  onTrade: (side: TradeSide, ticker: string) => void;
  onEdit: () => void;
};

// Modal de DETALHE do ativo (ao tocar num card): posição derivada + lista de operações (cada uma
// excluível, o que reverte o caixa via cascade) + ações Comprar mais / Vender / Editar. As ações
// só sinalizam pro parent (a tela troca o modal); o caixa/saldo se atualiza pela invalidação.
export function AssetDetailModal({ assetId, onClose, onTrade, onEdit }: AssetDetailModalProps) {
  const detail = useAsset(assetId);
  const deleteMut = useDeleteTrade();

  return (
    <ModalSheet title="Detalhe do ativo" onClose={onClose}>
      {renderBody()}
    </ModalSheet>
  );

  function renderBody() {
    if (detail.isPending) return <SectionSkeleton />;
    if (detail.isError)
      return <SectionError label="o ativo" onRetry={() => void detail.refetch()} />;
    const asset = detail.data;
    const tone = changeTone(asset.gainPct);

    return (
      <View className="gap-gutter">
        <View>
          <Text className="font-hanken-bold text-headline-sm text-on-surface">{asset.ticker}</Text>
          <Text className="font-geist-medium text-label-sm text-on-surface-variant">
            {asset.name}
          </Text>
        </View>

        <View className="gap-stack-sm rounded-xl border border-grid-line bg-surface-container-lowest p-stack-md">
          <InfoRow label="Quantidade" value={asset.netQuantity} />
          <MoneyInfoRow label="Preço médio" cents={asset.avgPriceCents} />
          <MoneyInfoRow label="Valor atual" cents={asset.currentValueCents} />
          <View className="flex-row items-center justify-between">
            <Text className="font-geist-medium text-label-md text-on-surface-variant">
              Ganho/Perda
            </Text>
            <View className="flex-row items-center gap-stack-sm">
              <MoneyText
                cents={asset.gainCents}
                hidden={false}
                tone={tone}
                className="font-geist-semibold text-label-md"
              />
              <Text className="font-geist-medium text-label-sm" style={{ color: toneColor(tone) }}>
                {formatPercent(asset.gainPct)}
              </Text>
            </View>
          </View>
          <MoneyInfoRow label="Resultado realizado" cents={asset.realizedCents} />
        </View>

        <AssetHistorySection assetId={assetId} tone={tone} hidden={false} />

        <View className="flex-row gap-stack-md">
          <Pressable
            onPress={() => onTrade('buy', asset.ticker)}
            accessibilityRole="button"
            accessibilityLabel="Comprar mais"
            className="min-h-11 flex-1 items-center justify-center rounded-full bg-primary px-gutter"
          >
            <Text className="font-geist-semibold text-label-md uppercase text-on-primary-container">
              Comprar mais
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onTrade('sell', asset.ticker)}
            accessibilityRole="button"
            accessibilityLabel="Vender"
            className="min-h-11 flex-1 items-center justify-center rounded-full border border-outline-variant px-gutter"
          >
            <Text className="font-geist-semibold text-label-md uppercase text-on-surface">
              Vender
            </Text>
          </Pressable>
        </View>
        <Pressable
          onPress={onEdit}
          accessibilityRole="button"
          accessibilityLabel="Editar ativo"
          className="min-h-11 items-center justify-center"
        >
          <Text className="font-geist-semibold text-label-md text-primary">Editar ativo</Text>
        </Pressable>

        <View className="gap-stack-sm">
          <Text className="font-geist-semibold text-label-sm uppercase text-on-surface-variant">
            Operações
          </Text>
          {asset.trades.length === 0 ? (
            <Text className="font-geist-medium text-label-sm text-on-surface-variant">
              Sem operações ainda.
            </Text>
          ) : (
            asset.trades.map((trade) => (
              <TradeRow
                key={trade.id}
                trade={trade}
                deleting={deleteMut.isPending}
                onDelete={() => deleteMut.mutate({ assetId, tradeId: trade.id })}
              />
            ))
          )}
        </View>
      </View>
    );
  }
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="font-geist-medium text-label-md text-on-surface-variant">{label}</Text>
      <Text className="font-geist-semibold text-label-md text-on-surface">{value}</Text>
    </View>
  );
}

function MoneyInfoRow({ label, cents }: { label: string; cents: number }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="font-geist-medium text-label-md text-on-surface-variant">{label}</Text>
      <MoneyText
        cents={cents}
        hidden={false}
        tone="neutral"
        className="font-geist-semibold text-label-md"
      />
    </View>
  );
}

type TradeRowProps = { trade: Trade; deleting: boolean; onDelete: () => void };

function TradeRow({ trade, deleting, onDelete }: TradeRowProps) {
  return (
    <View className="flex-row items-center justify-between border-b border-grid-line py-stack-sm">
      <View className="flex-1">
        <Text className="font-geist-semibold text-label-md text-on-surface">
          {trade.side === 'buy' ? 'Compra' : 'Venda'}
        </Text>
        <Text className="font-geist-medium text-label-sm text-on-surface-variant">
          {trade.quantity} @ {formatBRL(trade.unitPriceCents)} · {trade.tradedOn}
        </Text>
      </View>
      <Pressable
        onPress={onDelete}
        disabled={deleting}
        accessibilityRole="button"
        accessibilityLabel="Excluir operação"
        hitSlop={8}
        className="h-11 w-11 items-center justify-center"
      >
        <Icon name="close" size={18} color="#cbc3d7" />
      </Pressable>
    </View>
  );
}
