import { Text } from 'react-native';
import { formatBRL, MONEY_MASK } from '../lib/money';
import type { TransactionDirection } from '../types/transacoes';

// amountCents é a magnitude (sempre positiva); o sinal e o tom vêm do sentido.
const SIGN: Record<TransactionDirection, string> = { inflow: '+ ', outflow: '- ' };
const TONE_CLASS: Record<TransactionDirection, string> = {
  inflow: 'text-secondary',
  outflow: 'text-error',
};

type TransactionAmountProps = {
  amountCents: number;
  direction: TransactionDirection;
  hidden?: boolean;
  className?: string;
};

// Valor assinado de uma transação. Monta o texto à mão (sinal + formatBRL) num só nó
// de Text — quando hidden, mostra a máscara com accessibilityLabel "valor oculto"
// (mesmo contrato do MoneyText).
export function TransactionAmount({
  amountCents,
  direction,
  hidden = false,
  className = '',
}: TransactionAmountProps) {
  const text = hidden ? MONEY_MASK : `${SIGN[direction]}${formatBRL(amountCents)}`;
  return (
    <Text
      accessibilityLabel={hidden ? 'valor oculto' : undefined}
      className={`${TONE_CLASS[direction]} ${className}`}
    >
      {text}
    </Text>
  );
}
