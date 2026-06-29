import { Text, View } from 'react-native';
import { MoneyText } from '../MoneyText';
import type { Account } from '../../types/dashboard';

type ContasPanelProps = {
  accounts: Account[];
  hidden: boolean;
};

// Coluna Contas: lista cada conta com seu saldo (o detalhe "quanto em cada uma"). O total
// geral mora no herói (SaldoHero: Saldo líquido + Em bancos / Em espécie, do mesmo
// /patrimonio/overview que a tela de Contas). Esta coluna NÃO soma mais no client — a soma
// crua de GET /accounts incluía cartão (negativo) e exchange, divergindo do líquido.
export function ContasPanel({ accounts, hidden }: ContasPanelProps) {
  return (
    <View className="gap-stack-md p-stack-lg">
      <Text className="font-geist-medium text-label-sm uppercase text-on-surface-variant">
        Contas
      </Text>
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
