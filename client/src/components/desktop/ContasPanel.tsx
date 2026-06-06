import { Text, View } from 'react-native';
import { MoneyText } from '../MoneyText';
import type { Account } from '../../types/dashboard';

type ContasPanelProps = {
  accounts: Account[];
  hidden: boolean;
};

// Coluna Contas: total somado + lista com bolinhas de marca.
export function ContasPanel({ accounts, hidden }: ContasPanelProps) {
  const totalCents = accounts.reduce((sum, account) => sum + account.balanceCents, 0);
  return (
    <View className="gap-stack-md p-stack-lg">
      <View className="flex-row items-center justify-between">
        <Text className="font-geist-medium text-label-sm uppercase text-on-surface-variant">
          Contas
        </Text>
        <MoneyText
          cents={totalCents}
          hidden={hidden}
          tone="neutral"
          className="font-geist-semibold text-label-md"
        />
      </View>
      <View>
        {accounts.map((account) => (
          <View
            key={account.id}
            className="flex-row items-center justify-between border-b border-grid-line py-stack-sm"
          >
            <View className="flex-row items-center gap-stack-md">
              <View
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: account.dotColor }}
              />
              <Text className="font-hanken text-body-md text-on-surface">{account.name}</Text>
            </View>
            <MoneyText
              cents={account.balanceCents}
              hidden={hidden}
              tone="neutral"
              className="font-hanken text-body-md"
            />
          </View>
        ))}
      </View>
    </View>
  );
}
