import { Text, View } from 'react-native';
import { DesktopTransactionRow } from './DesktopTransactionRow';
import { Icon } from '../Icon';
import { TransactionFilterTabs } from '../TransactionFilterTabs';
import type { Transaction } from '../../types/transacoes';

type TransactionListPanelProps = { transactions: Transaction[]; hidden: boolean };

// Painel principal do desktop: barra de abas (visuais) + contagem, a lista de linhas
// e um rodapé de paginação (também visual nesta passada — sem backend que pagine).
export function TransactionListPanel({ transactions, hidden }: TransactionListPanelProps) {
  return (
    <View>
      <View className="flex-row items-center justify-between border-b border-grid-line p-stack-lg">
        <TransactionFilterTabs tabs={['Recentes', '30 Dias', 'Categorias']} />
        <Text className="font-geist-medium text-label-sm text-on-surface-variant">
          Exibindo {transactions.length} tragédias
        </Text>
      </View>

      <View>
        {transactions.map((transaction) => (
          <DesktopTransactionRow key={transaction.id} transaction={transaction} hidden={hidden} />
        ))}
      </View>

      <View className="flex-row items-center justify-between p-stack-lg">
        <View className="flex-row items-center gap-stack-sm">
          <Icon name="chevron_left" size={16} color="#cbc3d7" />
          <Text className="font-geist-medium text-label-sm text-on-surface-variant">Anterior</Text>
        </View>
        <Text className="font-geist-medium text-label-sm uppercase text-on-surface-variant">
          Página 1 de 1
        </Text>
        <View className="flex-row items-center gap-stack-sm">
          <Text className="font-geist-medium text-label-sm text-on-surface-variant">Próxima</Text>
          <Icon name="chevron_right" size={16} color="#cbc3d7" />
        </View>
      </View>
    </View>
  );
}
