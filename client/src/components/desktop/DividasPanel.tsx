import { View } from 'react-native';
import { PanelHeading } from './PanelHeading';
import { FutureDebtRow } from '../FutureDebtRow';
import type { FutureDebt } from '../../types/transacoes';

type DividasPanelProps = { debts: FutureDebt[]; hidden: boolean };

// Painel lateral de Dívidas Futuras (desktop): cabeçalho + cards de parcela/compromisso
// (reusa FutureDebtRow do mobile, com a barra de progresso).
export function DividasPanel({ debts, hidden }: DividasPanelProps) {
  return (
    <View className="gap-stack-md p-stack-lg">
      <PanelHeading icon="credit_card" iconColor="#ffb4ab" title="Dívidas Futuras" />
      {debts.map((debt) => (
        <FutureDebtRow key={debt.id} debt={debt} hidden={hidden} />
      ))}
    </View>
  );
}
