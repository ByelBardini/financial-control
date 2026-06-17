import { Text, View } from 'react-native';
import { Icon } from './Icon';
import { TransactionAmount } from './TransactionAmount';
import { RegisterRecurrenceButton } from './transacoes/RegisterRecurrenceButton';
import type { Recurrence } from '../types/transacoes';

type RecurrenceRowProps = { recurrence: Recurrence; hidden: boolean };

// Linha de recorrência (Salário, Netflix...): ícone + nome + categoria à esquerda; valor assinado
// pelo sentido (receita verde / assinatura vermelha) à direita. Quando a ocorrência do período
// corrente está pendente (isDue), mostra abaixo o botão "Registrar".
export function RecurrenceRow({ recurrence, hidden }: RecurrenceRowProps) {
  return (
    <View className="rounded-xl border border-outline-variant bg-surface-container p-stack-md">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center gap-stack-md">
          <Icon name={recurrence.icon} size={20} color="#cbc3d7" />
          <View className="flex-1">
            <Text className="font-geist-medium text-label-md text-on-surface">
              {recurrence.name}
            </Text>
            <Text className="font-geist-medium text-label-sm uppercase text-on-surface-variant">
              {recurrence.category}
            </Text>
          </View>
        </View>
        <TransactionAmount
          amountCents={recurrence.amountCents}
          direction={recurrence.direction}
          hidden={hidden}
          className="font-geist-medium text-label-md"
        />
      </View>
      {recurrence.isDue ? (
        <RegisterRecurrenceButton recurrenceId={recurrence.id} direction={recurrence.direction} />
      ) : null}
    </View>
  );
}
