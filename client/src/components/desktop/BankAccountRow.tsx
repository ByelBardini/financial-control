import { Pressable, Text, View } from 'react-native';
import { Card } from '../Card';
import { AccountGear } from '../contas/AccountGear';
import { Icon } from '../Icon';
import { MoneyText } from '../MoneyText';
import { toneColor } from '../../theme/colors';
import type { BankAccount } from '../../types/contas';

type BankAccountRowProps = {
  account: BankAccount;
  hidden: boolean;
  onPress?: () => void; // tocar na linha abre Transferir com esta conta como origem
  onEdit?: () => void; // engrenagem → editar/arquivar
};

// Linha de conta na lista "Bancos" do desktop: tile da marca + nome/subtítulo à esquerda; saldo +
// nota à direita. O corpo é um alvo "Transferir de {conta}"; a engrenagem (irmã) abre a edição.
export function BankAccountRow({ account, hidden, onPress, onEdit }: BankAccountRowProps) {
  const body = (
    <>
      <View className="flex-1 flex-row items-center gap-stack-md">
        <View
          className="h-12 w-12 items-center justify-center rounded-lg"
          style={{ backgroundColor: account.brandColor }}
        >
          <Icon name={account.icon} size={24} color="#ffffff" />
        </View>
        <View className="flex-1">
          <Text className="font-geist-semibold text-label-md text-on-surface">{account.name}</Text>
          <Text className="font-geist-medium text-label-sm uppercase text-on-surface-variant">
            {account.subtitle}
          </Text>
        </View>
      </View>
      <View className="items-end gap-stack-sm">
        <MoneyText
          cents={account.balanceCents}
          hidden={hidden}
          tone="neutral"
          className="font-hanken-semibold text-headline-sm"
        />
        <Text
          className="font-geist-medium text-label-sm"
          style={{ color: toneColor(account.noteTone) }}
        >
          {account.note}
        </Text>
      </View>
    </>
  );

  return (
    <Card variant="row" className="flex-row items-center gap-stack-md">
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
