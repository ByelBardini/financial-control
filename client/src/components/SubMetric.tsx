import { Text, View } from 'react-native';
import { MoneyText } from './MoneyText';
import type { Tone } from '../types/dashboard';

type SubMetricProps = {
  label: string;
  cents: number;
  tone: Tone;
  hidden: boolean;
};

// Uma métrica do hero (Receitas / Gastos / Investido): rótulo textual + valor
// colorido pelo tom. O rótulo carrega o significado (cor não é o único sinal).
export function SubMetric({ label, cents, tone, hidden }: SubMetricProps) {
  return (
    <View className="flex-1 gap-stack-sm">
      <Text className="font-geist-medium text-label-sm text-on-surface-variant">{label}</Text>
      <MoneyText cents={cents} hidden={hidden} tone={tone} className="font-hanken text-body-lg" />
    </View>
  );
}
