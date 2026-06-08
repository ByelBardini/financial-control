import { Text, View } from 'react-native';
import { EditableCard } from '../EditableCard';
import { Icon } from '../Icon';
import { MoneyText } from '../MoneyText';
import { toneColor } from '../../theme/colors';
import type { BankAccount } from '../../types/contas';

type BankAccountRowProps = {
  account: BankAccount;
  hidden: boolean;
  onPress?: () => void;
};

const rowClass = 'flex-row items-center justify-between border-b border-grid-line py-stack-md';

// Linha de conta na lista "Bancos" do desktop: tile da marca + nome/subtítulo à
// esquerda; saldo + nota (colorida pelo tom) à direita. Com onPress, vira um alvo
// "Editar conta" acessível.
export function BankAccountRow({ account, hidden, onPress }: BankAccountRowProps) {
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
    <EditableCard className={rowClass} editLabel={`Editar ${account.name}`} onPress={onPress}>
      {body}
    </EditableCard>
  );
}
