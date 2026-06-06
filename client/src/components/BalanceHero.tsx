import { Text, View } from 'react-native';
import { MoneyText } from './MoneyText';
import { StatusBadge } from './StatusBadge';
import { SubMetricsRow } from './SubMetricsRow';
import type { MonthBalance } from '../types/dashboard';

type BalanceHeroProps = {
  balance: MonthBalance;
  hidden: boolean;
};

// Herói da tela: saldo do mês em destaque + status + frase ácida + sub-métricas.
export function BalanceHero({ balance, hidden }: BalanceHeroProps) {
  return (
    <View className="gap-stack-md border-b border-outline-variant px-container-margin pb-stack-lg">
      <View className="flex-row items-center justify-between">
        <Text className="font-geist-medium text-label-md text-on-surface-variant">
          Saldo do Mês
        </Text>
        <StatusBadge label={balance.statusLabel} />
      </View>
      <MoneyText
        cents={balance.netCents}
        hidden={hidden}
        tone="primary"
        className="font-hanken-bold text-display-lg-mobile"
      />
      <Text className="font-geist-medium text-label-sm text-on-surface-variant">
        {balance.quip}
      </Text>
      <SubMetricsRow balance={balance} hidden={hidden} />
    </View>
  );
}
