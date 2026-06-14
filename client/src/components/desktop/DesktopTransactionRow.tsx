import { Text, View } from 'react-native';
import { TransactionAmount } from '../TransactionAmount';
import { TransactionTag } from '../TransactionTag';
import type { Transaction } from '../../types/transacoes';

type DesktopTransactionRowProps = { transaction: Transaction; hidden: boolean };

// Linha de transação do desktop: coluna de data + título + "conta • categoria" com a
// etiqueta, e o valor assinado à direita. Bordas finas (border-grid-line) no padrão
// enterprise das outras telas.
export function DesktopTransactionRow({ transaction, hidden }: DesktopTransactionRowProps) {
  return (
    <View className="flex-row items-center justify-between border-b border-grid-line px-stack-lg py-stack-md">
      <View className="flex-1 flex-row items-center gap-gutter">
        <Text className="w-12 border-r border-grid-line pr-gutter text-center font-geist-medium text-label-md text-on-surface-variant">
          {transaction.dateLabel}
        </Text>
        <View className="flex-1 gap-stack-sm">
          <Text className="font-geist-semibold text-label-md text-on-surface">
            {transaction.title}
          </Text>
          <View className="flex-row items-center gap-stack-sm">
            <Text className="font-geist-medium text-label-sm uppercase text-on-surface-variant">
              {transaction.accountLabel} • {transaction.category}
            </Text>
            <TransactionTag label={transaction.tag} tone={transaction.tagTone} />
          </View>
        </View>
      </View>
      <TransactionAmount
        amountCents={transaction.amountCents}
        direction={transaction.direction}
        hidden={hidden}
        className="font-hanken-semibold text-headline-sm"
      />
    </View>
  );
}
