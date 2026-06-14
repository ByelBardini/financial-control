import { Text, View } from 'react-native';
import { Icon } from './Icon';
import { MoneyText } from './MoneyText';
import { ProgressBar } from './ProgressBar';
import type { FutureDebt } from '../types/transacoes';

type FutureDebtRowProps = { debt: FutureDebt; hidden: boolean };

// Card de dívida futura/parcelada: ícone + rótulo + parcela, valor à direita, barra de
// progresso tingida pelo tom e nota ácida opcional. ProgressBar comunica o % ao leitor.
export function FutureDebtRow({ debt, hidden }: FutureDebtRowProps) {
  return (
    <View className="gap-stack-md rounded-xl border border-outline-variant bg-surface-container p-stack-md">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 flex-row items-center gap-stack-md">
          <View className="h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Icon name={debt.icon} size={20} color="#d0bcff" />
          </View>
          <View className="flex-1">
            <Text className="font-geist-medium text-label-md text-on-surface">{debt.label}</Text>
            <Text className="font-geist-medium text-label-sm text-on-surface-variant">
              {debt.installmentLabel}
            </Text>
          </View>
        </View>
        <MoneyText
          cents={debt.amountCents}
          hidden={hidden}
          tone="neutral"
          className="font-geist-medium text-label-md"
        />
      </View>

      <ProgressBar percent={debt.percent} tone={debt.tone} />

      {debt.note ? (
        <Text className="text-right font-geist-medium text-label-sm italic text-on-surface-variant">
          {debt.note}
        </Text>
      ) : null}
    </View>
  );
}
