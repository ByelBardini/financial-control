import { Text, View } from 'react-native';
import { Card } from './Card';
import { Icon } from './Icon';
import { TransactionAmount } from './TransactionAmount';
import { TransactionTag } from './TransactionTag';
import { toneColor } from '../theme/colors';
import type { Transaction } from '../types/transacoes';

// Tom do sentido: entra (verde/secondary) ou sai (vermelho/error). Tinge o tile do
// ícone e o valor; é diferente do tagTone (a etiqueta tem cor própria).
const directionTone = (t: Transaction) => (t.direction === 'inflow' ? 'secondary' : 'error');
const tileClass = (t: Transaction) =>
  t.direction === 'inflow' ? 'bg-secondary/10' : 'bg-error/10';

type TransactionRowProps = { transaction: Transaction; hidden: boolean; onPress?: () => void };

// Card de transação do layout mobile: tile do ícone (tingido pelo sentido) + título +
// etiqueta à esquerda; valor assinado + horário à direita. Com onPress, vira um alvo
// "Editar transação" acessível.
export function TransactionRow({ transaction, hidden, onPress }: TransactionRowProps) {
  return (
    <Card
      variant="outlined"
      className="flex-row items-center justify-between bg-surface-container p-stack-md"
      editLabel={`Editar ${transaction.title}`}
      onPress={onPress}
    >
      <View className="flex-1 flex-row items-center gap-stack-md">
        <View
          className={`h-10 w-10 items-center justify-center rounded-full ${tileClass(transaction)}`}
        >
          <Icon name={transaction.icon} size={20} color={toneColor(directionTone(transaction))} />
        </View>
        <View className="flex-1 gap-stack-sm">
          <Text className="font-geist-medium text-label-md text-on-surface">
            {transaction.title}
          </Text>
          <TransactionTag label={transaction.tag} tone={transaction.tagTone} />
        </View>
      </View>
      <View className="items-end gap-stack-sm">
        <TransactionAmount
          amountCents={transaction.amountCents}
          direction={transaction.direction}
          hidden={hidden}
          className="font-geist-medium text-label-md"
        />
        <Text className="font-geist-medium text-label-sm text-on-surface-variant">
          {transaction.timeLabel}
        </Text>
      </View>
    </Card>
  );
}
