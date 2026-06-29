import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { LabeledMoney } from './LabeledMoney';
import { MoneyText } from './MoneyText';
import { BANK_SUBTOTAL, CASH_SUBTOTAL, LIQUID_BALANCE } from '../lib/moneyLabels';
import type { PatrimonioOverview } from '../types/patrimonio';

type LiquidBalanceHeaderProps = {
  overview: PatrimonioOverview;
  hidden: boolean;
  size?: 'mobile' | 'desktop';
  right?: ReactNode;
};

// Bloco "quanto eu tenho hoje": o saldo LÍQUIDO em destaque + os subtotais Em bancos /
// Em espécie. Prop-driven, compartilhado pela Início e pela tela de Contas a partir da
// MESMA fonte (GET /patrimonio/overview) — é o que faz os dois baterem. right = slot
// opcional à direita do rótulo (badge de status na Início).
export function LiquidBalanceHeader({
  overview,
  hidden,
  size = 'mobile',
  right,
}: LiquidBalanceHeaderProps) {
  const bigClass =
    size === 'desktop'
      ? 'font-hanken-bold text-display-lg'
      : 'font-hanken-bold text-display-lg-mobile';
  return (
    <View className="gap-stack-md">
      <View className="flex-row items-center justify-between">
        <Text className="font-geist-medium text-label-md text-on-surface-variant">
          {LIQUID_BALANCE}
        </Text>
        {right}
      </View>
      <MoneyText
        cents={overview.liquidBalanceCents}
        hidden={hidden}
        tone="neutral"
        className={bigClass}
      />
      <View className="flex-row gap-stack-md border-t border-outline-variant pt-stack-md">
        <LabeledMoney label={BANK_SUBTOTAL} cents={overview.bankCents} hidden={hidden} fill />
        <LabeledMoney label={CASH_SUBTOTAL} cents={overview.cashCents} hidden={hidden} fill />
      </View>
    </View>
  );
}
