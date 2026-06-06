import { Text, View } from 'react-native';
import { MoneyText } from '../MoneyText';
import { SubMetric } from '../SubMetric';
import type { MonthBalance } from '../../types/dashboard';

type SaldoHeroProps = {
  balance: MonthBalance;
  hidden: boolean;
};

// Hero do grid desktop: saldo disponível em destaque + badge + sub-métricas.
export function SaldoHero({ balance, hidden }: SaldoHeroProps) {
  return (
    <View className="gap-stack-lg border-b border-grid-line p-stack-lg">
      <View className="flex-row items-start justify-between">
        <View className="gap-stack-sm">
          <Text className="font-geist-medium text-label-sm uppercase text-on-surface-variant">
            Saldo do Mês
          </Text>
          <Text className="font-geist-medium text-body-md text-on-surface-variant">
            {balance.availableLabel}
          </Text>
          <MoneyText
            cents={balance.netCents}
            hidden={hidden}
            tone="neutral"
            className="font-hanken-bold text-display-lg"
          />
        </View>
        <View className="flex-row items-center gap-stack-sm rounded-full border border-secondary/30 bg-secondary/10 px-stack-md py-stack-sm">
          <View className="h-2 w-2 rounded-full bg-secondary" />
          <Text className="font-geist-semibold text-label-sm uppercase text-secondary">
            {balance.statusLabel}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-stack-lg border-t border-grid-line pt-stack-md">
        <SubMetric
          label="Receitas"
          cents={balance.receitasCents}
          tone="secondary"
          hidden={hidden}
        />
        <SubMetric label="Gastos" cents={balance.gastosCents} tone="error" hidden={hidden} />
        <SubMetric
          label="Investido"
          cents={balance.investidoCents}
          tone="primary"
          hidden={hidden}
        />
      </View>
    </View>
  );
}
