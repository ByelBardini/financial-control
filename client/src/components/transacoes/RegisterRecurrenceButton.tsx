import { Pressable, Text } from 'react-native';
import { Icon } from '../Icon';
import { useRegisterRecurrence } from '../../hooks/useTransactionMutations';
import type { TransactionDirection } from '../../types/transacoes';

type RegisterRecurrenceButtonProps = {
  recurrenceId: string;
  direction: TransactionDirection;
};

// CTA "registrar pagamento/recebimento" (padrão de mercado "mark as paid"): aparece na linha da
// recorrência só quando a ocorrência do período corrente está pendente (isDue). Registra a
// ocorrência (lança a transação real); desabilita enquanto registra (anti clique-duplo) e, no
// sucesso, a invalidação recarrega a lista → a linha some o botão.
export function RegisterRecurrenceButton({
  recurrenceId,
  direction,
}: RegisterRecurrenceButtonProps) {
  const register = useRegisterRecurrence();
  const label = direction === 'inflow' ? 'Registrar recebimento' : 'Registrar pagamento';
  return (
    <Pressable
      onPress={() => register.mutate(recurrenceId)}
      disabled={register.isPending}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: register.isPending }}
      className="mt-stack-md min-h-11 flex-row items-center justify-center gap-stack-sm rounded-xl border border-outline-variant"
    >
      <Icon name="check" size={16} color="#d0bcff" />
      <Text className="font-geist-semibold text-label-md text-primary">
        {register.isPending ? 'Registrando…' : label}
      </Text>
    </Pressable>
  );
}
