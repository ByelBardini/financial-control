import { View } from 'react-native';
import { SubMetric } from './SubMetric';
import type { MonthBalance } from '../types/dashboard';

type SubMetricsRowProps = {
  balance: MonthBalance;
  hidden: boolean;
};

// Linha Receitas/Gastos/Investido adaptada do desktop para o mobile.
export function SubMetricsRow({ balance, hidden }: SubMetricsRowProps) {
  return (
    <View className="flex-row gap-stack-md border-t border-outline-variant pt-stack-md">
      <SubMetric label="Receitas" cents={balance.receitasCents} tone="secondary" hidden={hidden} />
      <SubMetric label="Gastos" cents={balance.gastosCents} tone="error" hidden={hidden} />
      <SubMetric label="Investido" cents={balance.investidoCents} tone="primary" hidden={hidden} />
    </View>
  );
}
