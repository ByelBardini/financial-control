import { Text, View } from 'react-native';
import { LabeledMoney } from './LabeledMoney';
import { LiquidBalanceHeader } from './LiquidBalanceHeader';
import { StatusBadge } from './StatusBadge';
import { SubMetricsRow } from './SubMetricsRow';
import { ASSETS_TOTAL, CRYPTO_SUBTOTAL } from '../lib/moneyLabels';
import type { MonthBalance } from '../types/dashboard';
import type { PatrimonioOverview } from '../types/patrimonio';

type BalanceHeroProps = {
  balance: MonthBalance;
  overview: PatrimonioOverview;
  hidden: boolean;
};

// Herói da Início: o saldo LÍQUIDO ("quanto eu tenho hoje") em destaque + status, frase
// ácida, as métricas do mês (fluxo) e o patrimônio em ativos/cripto à parte. O resultado
// do mês deixou de ser o número-herói (era um FLUXO no lugar de "quanto eu tenho", o que
// confundia) e virou métrica secundária, rotulada "do mês".
export function BalanceHero({ balance, overview, hidden }: BalanceHeroProps) {
  return (
    <View className="gap-stack-md border-b border-outline-variant px-container-margin pb-stack-lg">
      <LiquidBalanceHeader
        overview={overview}
        hidden={hidden}
        right={<StatusBadge label={balance.statusLabel} />}
      />
      <Text className="font-geist-medium text-label-sm text-on-surface-variant">
        {balance.quip}
      </Text>
      <SubMetricsRow balance={balance} hidden={hidden} />
      <View className="flex-row gap-stack-md border-t border-outline-variant pt-stack-md">
        <LabeledMoney label={ASSETS_TOTAL} cents={overview.investedCents} hidden={hidden} fill />
        <LabeledMoney label={CRYPTO_SUBTOTAL} cents={overview.cryptoCents} hidden={hidden} fill />
      </View>
    </View>
  );
}
