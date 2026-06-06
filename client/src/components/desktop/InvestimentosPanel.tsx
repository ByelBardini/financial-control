import { Text, View } from 'react-native';
import { MoneyText } from '../MoneyText';
import { formatPercent } from '../../lib/percent';
import type { Investment, InvestmentsSummary } from '../../types/dashboard';

type InvestimentosPanelProps = {
  investments: Investment[];
  summary: InvestmentsSummary;
  hidden: boolean;
};

// Coluna Investimentos: total da carteira + ganho + itens com variação.
export function InvestimentosPanel({ investments, summary, hidden }: InvestimentosPanelProps) {
  return (
    <View className="gap-stack-lg p-stack-lg">
      <View className="flex-row items-start justify-between">
        <View className="gap-stack-sm">
          <Text className="font-geist-medium text-label-sm uppercase text-on-surface-variant">
            Investimentos
          </Text>
          <MoneyText
            cents={summary.totalCents}
            hidden={hidden}
            tone="neutral"
            className="font-hanken-semibold text-headline-md"
          />
        </View>
        <View className="items-end gap-stack-sm">
          <MoneyText
            cents={summary.changeCents}
            hidden={hidden}
            tone="secondary"
            className="font-geist-medium text-label-sm"
          />
          <View className="rounded bg-secondary/10 px-stack-sm py-[2px]">
            <Text className="font-geist-medium text-label-sm text-secondary">
              {formatPercent(summary.changePct)}
            </Text>
          </View>
        </View>
      </View>

      <View className="gap-stack-sm">
        {investments.map((investment) => (
          <View
            key={investment.id}
            className="flex-row items-center gap-stack-md rounded border border-grid-line p-stack-md"
          >
            <Text
              numberOfLines={1}
              className="flex-1 font-geist-medium text-label-md text-on-surface-variant"
            >
              {investment.name}
            </Text>
            <MoneyText
              cents={investment.valueCents}
              hidden={hidden}
              tone="neutral"
              className="font-hanken text-body-md"
            />
            <Text className="w-14 text-right font-geist-medium text-label-sm text-secondary">
              {formatPercent(investment.dailyChangePct)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
