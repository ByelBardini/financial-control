import { useState } from 'react';
import { Text, View } from 'react-native';
import { ModalSheet, apiErrorMessage } from '../ModalSheet';
import { AuthButton } from '../auth/AuthButton';
import { FormField } from '../auth/FormField';
import { SelectField } from '../SelectField';
import { MoneyField } from './MoneyField';
import { useCreateTransaction } from '../../hooks/useTransactionMutations';
import { defaultMonth, monthOptions, monthToOccurredOn } from '../../lib/monthOptions';

type LancarFaturaModalProps = {
  cardId: string;
  onClose: () => void;
};

// Modal dedicado de "Lançar na fatura": escolhe um MÊS (não dia) + valor e cria uma despesa no
// cartão com competência no 1º dia do mês. Aparece em Transações como despesa e em Dívidas Futuras
// como "Fatura {Mês/Ano} - {cartão}" (agregada por mês no server). Reusa useCreateTransaction.
export function LancarFaturaModal({ cardId, onClose }: LancarFaturaModalProps) {
  const createMut = useCreateTransaction();
  // Mês corrente + até 12 meses no futuro; nenhum mês no passado (back=0). Corrente vem primeiro.
  const [options] = useState(() => monthOptions(new Date(), 0, 12));
  const [month, setMonth] = useState(() => defaultMonth(new Date()));
  const [amountCents, setAmountCents] = useState(0);
  const [description, setDescription] = useState('');
  const [amountError, setAmountError] = useState<string | undefined>(undefined);

  const serverError = apiErrorMessage(createMut.error);
  const monthLabel = options.find((o) => o.value === month)?.label ?? month;

  function handleSubmit() {
    if (amountCents <= 0) {
      setAmountError('Informe um valor maior que zero.');
      return;
    }
    setAmountError(undefined);
    createMut.mutate(
      {
        accountId: cardId,
        categoryId: null,
        description: description.trim() || `Fatura ${monthLabel}`,
        direction: 'outflow',
        amountCents,
        occurredOn: monthToOccurredOn(month),
      },
      { onSuccess: onClose },
    );
  }

  return (
    <ModalSheet title="Lançar na fatura" onClose={onClose}>
      <View className="gap-gutter">
        <SelectField label="Mês da fatura" value={month} options={options} onChange={setMonth} />
        <MoneyField
          label="Valor"
          valueCents={amountCents}
          onChangeCents={setAmountCents}
          error={amountError}
        />
        <FormField
          label="Descrição (opcional)"
          value={description}
          onChangeText={setDescription}
          placeholder="Ex.: Compras do mês"
        />
        {serverError ? (
          <Text accessibilityRole="alert" className="text-label-sm text-error">
            {serverError}
          </Text>
        ) : null}
        <AuthButton label="Lançar" onPress={handleSubmit} loading={createMut.isPending} />
      </View>
    </ModalSheet>
  );
}
