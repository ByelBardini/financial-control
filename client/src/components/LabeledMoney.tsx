import { Text, View } from 'react-native';
import { MoneyText } from './MoneyText';
import type { Tone } from '../types/dashboard';

type LabeledMoneyProps = {
  label: string;
  cents: number;
  tone?: Tone;
  hidden?: boolean;
  fill?: boolean;
};

// Rótulo textual + valor colorido pelo tom: o átomo único das métricas de hero
// e de fluxo. Formata só na borda via MoneyText (respeita a máscara de ocultar);
// o rótulo carrega o significado (cor não é o único sinal). fill estica em
// colunas de largura igual. Substitui SubMetric e CashflowMetric.
export function LabeledMoney({
  label,
  cents,
  tone = 'neutral',
  hidden = false,
  fill = false,
}: LabeledMoneyProps) {
  return (
    <View className={`gap-stack-sm ${fill ? 'flex-1' : ''}`}>
      <Text className="font-geist-medium text-label-sm text-on-surface-variant">{label}</Text>
      <MoneyText cents={cents} hidden={hidden} tone={tone} className="font-hanken text-body-lg" />
    </View>
  );
}
