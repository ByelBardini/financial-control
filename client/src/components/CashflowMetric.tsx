import { Text, View } from 'react-native';
import { MoneyText } from './MoneyText';
import type { Tone } from '../types/dashboard';

type CashflowMetricProps = {
  label: string;
  cents: number;
  tone?: Tone;
  hidden?: boolean;
};

// Métrica de fluxo de caixa (rótulo + valor): Inflow/Outflow/Net Burn. Átomo
// compartilhado pela faixa do desktop e pelos cards do mobile — formata só na borda
// via MoneyText (respeita a máscara de ocultar valores).
export function CashflowMetric({
  label,
  cents,
  tone = 'neutral',
  hidden = false,
}: CashflowMetricProps) {
  return (
    <View className="gap-stack-sm">
      <Text className="font-geist-medium text-label-sm text-on-surface-variant">{label}</Text>
      <MoneyText
        cents={cents}
        hidden={hidden}
        tone={tone}
        className="font-hanken-semibold text-headline-sm"
      />
    </View>
  );
}
