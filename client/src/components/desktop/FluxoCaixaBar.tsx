import { Text, View } from 'react-native';
import { CashflowMetric } from '../CashflowMetric';
import { PanicMeter } from '../PanicMeter';
import type { CashflowSummary } from '../../types/transacoes';

type FluxoCaixaBarProps = { summary: CashflowSummary; hidden: boolean };

// Faixa superior do desktop: métricas de fluxo de caixa (Inflow/Outflow/Net Burn) à
// esquerda e a Previsão de Colapso (PanicMeter) à direita. Prop-driven.
export function FluxoCaixaBar({ summary, hidden }: FluxoCaixaBarProps) {
  return (
    <View className="gap-stack-lg border-b border-grid-line p-stack-lg">
      <Text className="font-geist-semibold text-label-sm uppercase text-on-surface-variant">
        FLUXO DE CAIXA OPERACIONAL
      </Text>
      <View className="flex-row flex-wrap items-end justify-between gap-stack-lg">
        <View className="flex-row gap-x-12 gap-y-stack-md">
          <CashflowMetric
            label="Inflow (Esperança)"
            cents={summary.inflowCents}
            tone="secondary"
            hidden={hidden}
          />
          <CashflowMetric
            label="Outflow (Realidade)"
            cents={summary.outflowCents}
            tone="error"
            hidden={hidden}
          />
          <CashflowMetric
            label="Net Burn Rate"
            cents={summary.netBurnCents}
            tone="neutral"
            hidden={hidden}
          />
        </View>
        <View className="flex-1 basis-64">
          <PanicMeter panic={summary.collapse} caption="Previsão de Colapso" />
        </View>
      </View>
    </View>
  );
}
