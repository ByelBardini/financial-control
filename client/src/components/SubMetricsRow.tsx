import { View } from 'react-native';
import { LabeledMoney } from './LabeledMoney';
import { MONTH_EXPENSE, MONTH_INCOME, MONTH_RESULT } from '../lib/moneyLabels';
import type { MonthBalance, Tone } from '../types/dashboard';

type SubMetricsRowProps = {
  balance: MonthBalance;
  hidden: boolean;
};

// Métricas de FLUXO do mês (Receitas / Gastos / Resultado), rotuladas "do mês" pra não
// confundir com o saldo líquido (estoque) em destaque no herói. O resultado colore pelo
// sinal (verde no positivo, vermelho no negativo).
export function SubMetricsRow({ balance, hidden }: SubMetricsRowProps) {
  const resultTone: Tone =
    balance.netCents > 0 ? 'secondary' : balance.netCents < 0 ? 'error' : 'neutral';
  return (
    <View className="flex-row gap-stack-md border-t border-outline-variant pt-stack-md">
      <LabeledMoney
        label={MONTH_INCOME}
        cents={balance.receitasCents}
        tone="secondary"
        hidden={hidden}
        fill
      />
      <LabeledMoney
        label={MONTH_EXPENSE}
        cents={balance.gastosCents}
        tone="error"
        hidden={hidden}
        fill
      />
      <LabeledMoney
        label={MONTH_RESULT}
        cents={balance.netCents}
        tone={resultTone}
        hidden={hidden}
        fill
      />
    </View>
  );
}
