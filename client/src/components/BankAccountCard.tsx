import { Pressable, Text, View } from 'react-native';
import { Card } from './Card';
import { AccountGear } from './contas/AccountGear';
import { Icon } from './Icon';
import { MoneyText } from './MoneyText';
import { toneColor } from '../theme/colors';
import type { BankAccount } from '../types/contas';

type BankAccountCardProps = {
  account: BankAccount;
  hidden: boolean;
  onPress?: () => void; // tocar no card abre Transferir com esta conta como origem
  onEdit?: () => void; // engrenagem → editar/arquivar
};

// Card de conta bancária (layout mobile): tile da marca + nome + nota ácida + saldo. O corpo é um
// alvo "Transferir de {conta}"; a engrenagem (irmã, não aninhada) abre a edição.
export function BankAccountCard({ account, hidden, onPress, onEdit }: BankAccountCardProps) {
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
      className="flex-row items-center gap-stack-sm bg-surface-container-high p-stack-md"
    >
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole="button"
        accessibilityLabel={`Transferir de ${account.name}`}
        className="flex-1 flex-row items-center justify-between gap-stack-md"
      >
        {body}
      </Pressable>
      {onEdit ? <AccountGear name={account.name} onEdit={onEdit} /> : null}
    </Card>
  );
}
