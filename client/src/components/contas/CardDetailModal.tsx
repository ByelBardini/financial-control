import { Pressable, Text, View } from 'react-native';
import { ModalSheet } from '../ModalSheet';
import { SectionError } from '../SectionError';
import { SectionSkeleton } from '../SectionSkeleton';
import { Icon } from '../Icon';
import { MoneyText } from '../MoneyText';
import { ProgressBar } from '../ProgressBar';
import { formatBRL } from '../../lib/money';
import { useCardDetail } from '../../hooks/useContasQueries';
import type { InvoiceMonth } from '../../types/contas';

type CardDetailModalProps = {
  cardId: string;
  onClose: () => void;
  onEdit: () => void;
  onLancar: () => void;
  onPagar: (invoiceCents: number) => void;
};

// Modal de DETALHE do cartão (ao tocar no card): cabeçalho (limite/fatura/disponível/% usado) +
// faturas por mês (cada uma com seus lançamentos) + ações "Lançar"/"Pagar fatura". O lápis/engrenagem
// vai pra edição (tipo/aparência), que deixou de ser o clique principal. As ações só sinalizam pro
// parent (a tela troca o overlay); saldo/fatura se atualizam pela invalidação.
export function CardDetailModal({
  cardId,
  onClose,
  onEdit,
  onLancar,
  onPagar,
}: CardDetailModalProps) {
  const detail = useCardDetail(cardId);

  return (
    <ModalSheet title="Detalhe do cartão" onClose={onClose}>
      {renderBody()}
    </ModalSheet>
  );

  function renderBody() {
    if (detail.isPending) return <SectionSkeleton />;
    if (detail.isError)
      return <SectionError label="o cartão" onRetry={() => void detail.refetch()} />;
    const card = detail.data;

    return (
      <View className="gap-gutter">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center gap-stack-md">
            <View
              className="h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: card.brandColor }}
            >
              <Icon name={card.icon} size={20} color="#ffffff" />
            </View>
            <Text className="flex-1 font-hanken-bold text-headline-sm text-on-surface">
              {card.name}
            </Text>
          </View>
          <Pressable
            onPress={onEdit}
            accessibilityRole="button"
            accessibilityLabel="Editar cartão"
            hitSlop={8}
            className="h-11 w-11 items-center justify-center"
          >
            <Icon name="settings" size={22} color="#cbc3d7" accessibilityLabel="Editar cartão" />
          </Pressable>
        </View>

        <View className="gap-stack-sm rounded-xl border border-grid-line bg-surface-container-lowest p-stack-md">
          <View>
            <Text className="font-geist-medium text-label-sm text-on-surface-variant">
              Fatura atual
            </Text>
            <MoneyText
              cents={card.invoiceCents}
              hidden={false}
              tone="neutral"
              className="font-hanken-semibold text-headline-sm"
            />
          </View>
          <ProgressBar percent={card.usedPercent} tone="neutral" />
          <View className="flex-row items-center justify-between">
            <Text className="font-geist-medium text-label-sm text-on-surface-variant">
              Disponível
            </Text>
            <Text className="font-geist-semibold text-label-md text-on-surface">
              {`${formatBRL(card.availableCents)} de ${formatBRL(card.limitCents)}`}
            </Text>
          </View>
        </View>

        <View className="flex-row gap-stack-md">
          <Pressable
            onPress={onLancar}
            accessibilityRole="button"
            accessibilityLabel="Lançar na fatura"
            className="min-h-11 flex-1 items-center justify-center rounded-full bg-primary px-gutter"
          >
            <Text className="font-geist-semibold text-label-md uppercase text-on-primary-container">
              Lançar
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onPagar(card.invoiceCents)}
            accessibilityRole="button"
            accessibilityLabel="Pagar fatura"
            className="min-h-11 flex-1 items-center justify-center rounded-full border border-outline-variant px-gutter"
          >
            <Text className="font-geist-semibold text-label-md uppercase text-on-surface">
              Pagar fatura
            </Text>
          </Pressable>
        </View>

        <View className="gap-stack-md">
          <Text className="font-geist-semibold text-label-sm uppercase text-on-surface-variant">
            Faturas por mês
          </Text>
          {card.months.length === 0 ? (
            <Text className="font-geist-medium text-label-sm text-on-surface-variant">
              Nenhum lançamento ainda.
            </Text>
          ) : (
            card.months.map((month) => <InvoiceMonthBlock key={month.month} month={month} />)
          )}
        </View>
      </View>
    );
  }
}

// InvoiceMonthBlock é a fatura de um mês: rótulo + líquido devido + os lançamentos (entradas
// de pagamento aparecem em tom positivo).
function InvoiceMonthBlock({ month }: { month: InvoiceMonth }) {
  return (
    <View className="gap-stack-sm rounded-xl border border-grid-line bg-surface-container-lowest p-stack-md">
      <View className="flex-row items-center justify-between">
        <Text className="font-geist-semibold text-label-md text-on-surface">{month.label}</Text>
        <MoneyText
          cents={month.netCents}
          hidden={false}
          tone="neutral"
          className="font-geist-semibold text-label-md"
        />
      </View>
      {month.entries.map((entry) => (
        <View
          key={entry.id}
          className="flex-row items-center justify-between border-b border-grid-line py-stack-sm"
        >
          <View className="flex-1">
            <Text className="font-geist-medium text-label-md text-on-surface">
              {entry.description}
            </Text>
            <Text className="font-geist-medium text-label-sm text-on-surface-variant">
              {entry.category ? `${entry.occurredOn} · ${entry.category}` : entry.occurredOn}
            </Text>
          </View>
          <MoneyText
            cents={entry.amountCents}
            hidden={false}
            tone={entry.direction === 'inflow' ? 'secondary' : 'neutral'}
            className="font-geist-semibold text-label-md"
          />
        </View>
      ))}
    </View>
  );
}
