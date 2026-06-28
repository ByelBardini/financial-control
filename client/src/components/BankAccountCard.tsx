import { Text, View } from 'react-native';
import { Card } from './Card';
import { Icon } from './Icon';
import { MoneyText } from './MoneyText';
import { toneColor } from '../theme/colors';
import type { BankAccount } from '../types/contas';

type BankAccountCardProps = {
  account: BankAccount;
  hidden: boolean;
  onPress?: () => void;
};

// Card de conta bancária (layout mobile): tile da marca + nome + nota ácida + saldo.
// Com onPress, vira um alvo "Editar conta" acessível.
export function BankAccountCard({ account, hidden, onPress }: BankAccountCardProps) {
  const body = (
    <>
      <View className="flex-1 flex-row items-center gap-stack-md">
        <View
          className="h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: account.brandColor }}
        >
          <Icon name={account.icon} size={20} color="#ffffff" />
        </View>
        <View className="flex-1">
          <Text className="font-geist-medium text-label-md text-on-surface">{account.name}</Text>
          <Text
            className="font-geist-medium text-label-sm"
            style={{ color: toneColor(account.noteTone) }}
          >
            {account.note}
          </Text>
        </View>
      </View>
      <MoneyText
        cents={account.balanceCents}
        hidden={hidden}
        tone="neutral"
        className="font-hanken-semibold text-headline-sm"
      />
    </>
  );

  return (
    <Card
      variant="outlined"
      className="flex-row items-center justify-between bg-surface-container-high p-stack-md"
      editLabel={`Editar ${account.name}`}
      onPress={onPress}
    >
      {body}
    </Card>
  );
}
