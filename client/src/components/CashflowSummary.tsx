import { Text, View } from 'react-native';
import { LabeledMoney } from './LabeledMoney';
import { MoneyText } from './MoneyText';
import { ProgressBar } from './ProgressBar';
import type { CashflowSummary as CashflowSummaryData } from '../types/transacoes';

type CashflowSummaryProps = { summary: CashflowSummaryData; hidden: boolean };

const cardClass = 'flex-1 rounded-xl border border-outline-variant bg-surface-container p-stack-md';

// Bloco de fluxo de caixa do mobile: dois cards (Esperança/Realidade) + um card de
// Net Burn com barra de consumo. Prop-driven; formata só na borda via os átomos.
export function CashflowSummary({ summary, hidden }: CashflowSummaryProps) {
  return (
    <View className="gap-stack-md">
      <View className="flex-row gap-stack-md">
        <View className={cardClass}>
          <LabeledMoney
            label="Esperança (Inflow)"
            cents={summary.inflowCents}
            tone="secondary"
            hidden={hidden}
          />
        </View>
        <View className={cardClass}>
          <LabeledMoney
            label="Realidade (Outflow)"
            cents={summary.outflowCents}
            tone="error"
            hidden={hidden}
          />
        </View>
      </View>

      <View className="rounded-xl border border-outline-variant bg-surface-container p-stack-md">
        <View className="mb-stack-md flex-row items-center justify-between">
          <Text className="font-geist-medium text-label-sm text-on-surface-variant">
            Net Burn Rate
          </Text>
          <MoneyText
            cents={summary.netBurnCents}
            hidden={hidden}
            tone="error"
            className="font-geist-semibold text-label-md"
          />
        </View>
        <ProgressBar percent={summary.burnPercent} tone="primary" />
      </View>
    </View>
  );
}
