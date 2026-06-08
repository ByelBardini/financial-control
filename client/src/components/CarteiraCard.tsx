import { Text, View } from 'react-native';
import { Icon } from './Icon';
import { MoneyText } from './MoneyText';
import { ProgressBar } from './ProgressBar';
import { colors } from '../theme/colors';
import type { CashWallet } from '../types/contas';

type CarteiraCardProps = {
  cash: CashWallet;
  hidden: boolean;
};

// Carteira física (dinheiro em espécie): saldo + frase + medidor de confiança.
// Autocontido (traz o próprio título) pra servir mobile e desktop sem duplicar heading.
export function CarteiraCard({ cash, hidden }: CarteiraCardProps) {
  return (
    <View className="gap-stack-md rounded-xl border border-outline-variant bg-surface-container-high p-stack-lg">
      <View className="flex-row items-center gap-stack-md">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-container-highest">
          <Icon name="savings" size={20} color={colors.onSurfaceVariant} />
        </View>
        <Text className="font-geist-medium text-label-sm uppercase text-on-surface-variant">
          Carteira Física
        </Text>
      </View>
      <MoneyText
        cents={cash.balanceCents}
        hidden={hidden}
        tone="neutral"
        className="font-hanken-bold text-headline-md"
      />
      <Text className="font-geist-medium text-label-sm text-on-surface-variant">{cash.quip}</Text>
      <View className="gap-stack-sm">
        <View className="flex-row items-center justify-between">
          <Text className="font-geist-medium text-label-sm text-on-surface-variant">
            {cash.confidenceLabel}
          </Text>
          <Text className="font-geist-medium text-label-sm text-secondary">
            {cash.confidencePercent}%
          </Text>
        </View>
        <ProgressBar percent={cash.confidencePercent} tone="secondary" />
      </View>
    </View>
  );
}
