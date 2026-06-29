import { Text, View } from 'react-native';
import { LabeledMoney } from '../LabeledMoney';
import { LiquidBalanceHeader } from '../LiquidBalanceHeader';
import {
  ASSETS_TOTAL,
  CRYPTO_SUBTOTAL,
  MONTH_EXPENSE,
  MONTH_INCOME,
  MONTH_RESULT,
} from '../../lib/moneyLabels';
import type { MonthBalance, Tone } from '../../types/dashboard';
import type { PatrimonioOverview } from '../../types/patrimonio';

type SaldoHeroProps = {
  balance: MonthBalance;
  overview: PatrimonioOverview;
  hidden: boolean;
};

// Hero do grid desktop: o saldo LÍQUIDO ("quanto eu tenho hoje") em destaque + os subtotais
// Em bancos / Em espécie + as métricas do mês (fluxo) e o patrimônio em ativos/cripto à parte.
// Mesma fonte da tela de Contas → os dois mostram o mesmo "Saldo líquido".
export function SaldoHero({ balance, overview, hidden }: SaldoHeroProps) {
  const resultTone: Tone =
    balance.netCents > 0 ? 'secondary' : balance.netCents < 0 ? 'error' : 'neutral';
  const statusBadge = (
    <View className="flex-row items-center gap-stack-sm rounded-full border border-secondary/30 bg-secondary/10 px-stack-md py-stack-sm">
      <View className="h-2 w-2 rounded-full bg-secondary" />
      <Text className="font-geist-semibold text-label-sm uppercase text-secondary">
        {balance.statusLabel}
      </Text>
    </View>
  );
  return (
    <View className="gap-stack-lg border-b border-grid-line p-stack-lg">
      <LiquidBalanceHeader overview={overview} hidden={hidden} size="desktop" right={statusBadge} />
      <View className="flex-row flex-wrap gap-stack-lg border-t border-grid-line pt-stack-md">
        <LabeledMoney
          label={MONTH_INCOME}
          cents={balance.receitasCents}
          tone="secondary"
          hidden={hidden}
          fill
        />
        <LabeledMoney label={MONTH_EXPENSE} cents={balance.gastosCents} tone="error" hidden={hidden} fill />
        <LabeledMoney label={MONTH_RESULT} cents={balance.netCents} tone={resultTone} hidden={hidden} fill />
        <LabeledMoney label={ASSETS_TOTAL} cents={overview.investedCents} hidden={hidden} fill />
        <LabeledMoney label={CRYPTO_SUBTOTAL} cents={overview.cryptoCents} hidden={hidden} fill />
      </View>
    </View>
  );
}
