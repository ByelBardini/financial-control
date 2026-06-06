import { Text, View } from 'react-native';
import { Icon } from './Icon';
import { MoneyText } from './MoneyText';
import { toneColor } from '../theme/colors';
import type { Account } from '../types/dashboard';

type AccountRowProps = {
  account: Account;
  hidden: boolean;
};

// Linha de conta: ícone tingido pelo tom + nome + saldo colorido. O ícone é
// decorativo (o nome já identifica a conta pro leitor de tela).
export function AccountRow({ account, hidden }: AccountRowProps) {
  return (
    <View className="flex-row items-center justify-between py-base">
      <View className="flex-row items-center gap-base">
        <Icon name={account.icon} size={20} color={toneColor(account.tone)} />
        <Text className="font-hanken text-body-md text-on-surface">{account.name}</Text>
      </View>
      <MoneyText
        cents={account.balanceCents}
        hidden={hidden}
        tone={account.tone}
        className="font-geist-medium text-label-md"
      />
    </View>
  );
}
