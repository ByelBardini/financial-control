import { useState } from 'react';
import { Text, View } from 'react-native';
import { AuthButton } from '../auth/AuthButton';
import { FormField } from '../auth/FormField';
import { DateField } from '../DateField';
import { SelectField } from '../SelectField';
import { MoneyField } from '../contas/MoneyField';
import { DeleteTransactionButton } from './DeleteTransactionButton';
import { EntryKindSelect } from './EntryKindSelect';
import { RecurrenceFields } from './RecurrenceFields';
import {
  validateTransactionForm,
  type TransactionEntryKind,
  type TransactionFormErrors,
  type TransactionFormValues,
} from '../../lib/transactionForm';
import { formatBRL } from '../../lib/money';
import type { IconName } from '../Icon';
import type { Category } from '../../types/transacoes';

// Presets de nº de parcelas (cobre 2x até 24x — os casos comuns de "parcelado sem juros").
const INSTALLMENT_COUNTS = [2, 3, 4, 5, 6, 10, 12, 18, 24];
const installmentOptions = INSTALLMENT_COUNTS.map((n) => ({ value: String(n), label: `${n}x` }));

type AccountOption = { id: string; name: string; icon: IconName; dotColor: string };

type TransactionFormProps = {
  mode: 'create' | 'edit';
  initial: TransactionFormValues;
  accounts: AccountOption[];
  categories: Category[];
  submitting?: boolean;
  deleting?: boolean;
  serverError?: string;
  onSubmit: (values: TransactionFormValues) => void;
  onDelete?: () => void;
};

const NO_CATEGORY = { value: '', label: 'Sem categoria' };

// Formulário de transação (criar/editar). Campos na ordem da pesquisa: Valor → Tipo → Conta →
// Categoria (filtrada pelo sentido) → Descrição → Data. Edição não troca de conta (gatilho
// travado) e ganha o botão de excluir. Valida no client; o parent (modal) mapeia + chama a mutation.
export function TransactionForm({
  mode,
  initial,
  accounts,
  categories,
  submitting = false,
  deleting = false,
  serverError,
  onSubmit,
  onDelete,
}: TransactionFormProps) {
  const [values, setValues] = useState<TransactionFormValues>(initial);
  const [errors, setErrors] = useState<TransactionFormErrors>({});

  function patch(next: Partial<TransactionFormValues>) {
    setValues((current) => ({ ...current, ...next }));
  }

  // O sentido (Despesa/Receita) vem travado do mini menu — não há toggle aqui. Parcelado é
  // sempre despesa e só aparece quando o sentido é outflow (EntryKindSelect esconde no inflow),
  // então trocar o tipo só atualiza entryKind; a categoria segue filtrada por values.direction.
  function handleEntryKindChange(entryKind: TransactionEntryKind) {
    patch({ entryKind });
  }

  const isParcelado = values.entryKind === 'parcelado';
  const isFixo = values.entryKind === 'fixo';

  function handleSubmit() {
    const nextErrors = validateTransactionForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSubmit(values);
  }

  const kind = values.direction === 'inflow' ? 'income' : 'expense';
  // Conta mostra ícone tingido pela cor da marca; categoria só o ícone (sem cor própria).
  const categoryOptions = [
    NO_CATEGORY,
    ...categories
      .filter((c) => c.kind === kind)
      .map((c) => ({ value: c.id, label: c.name, icon: c.icon })),
  ];
  const accountOptions = accounts.map((a) => ({
    value: a.id,
    label: a.name,
    icon: a.icon,
    dotColor: a.dotColor,
  }));

  return (
    <View className="gap-gutter">
      {mode === 'create' ? (
        <EntryKindSelect
          value={values.entryKind}
          direction={values.direction}
          onChange={handleEntryKindChange}
        />
      ) : null}

      <MoneyField
        label={isParcelado ? 'Valor da parcela' : 'Valor'}
        valueCents={values.amountCents}
        onChangeCents={(amountCents) => patch({ amountCents })}
        error={errors.amount}
      />

      {isParcelado ? (
        <View className="gap-stack-sm">
          <SelectField
            label="Parcelas"
            value={String(values.installmentCount)}
            options={installmentOptions}
            onChange={(n) => patch({ installmentCount: Number(n) })}
            error={errors.installments}
          />
          <Text className="font-geist-medium text-label-sm text-on-surface-variant">
            Total: {formatBRL(values.amountCents * values.installmentCount)} em{' '}
            {values.installmentCount}× de {formatBRL(values.amountCents)}
          </Text>
        </View>
      ) : null}

      <SelectField
        label="Conta"
        value={values.accountId}
        options={accountOptions}
        onChange={(accountId) => patch({ accountId })}
        placeholder="Escolha uma conta"
        disabled={mode === 'edit'}
        error={errors.account}
      />

      <SelectField
        label="Categoria"
        value={values.categoryId}
        options={categoryOptions}
        onChange={(categoryId) => patch({ categoryId })}
        placeholder="Sem categoria"
      />

      <FormField
        label="Descrição"
        value={values.description}
        onChangeText={(description) => patch({ description })}
        placeholder="Ex.: Mercado da esquina"
        error={errors.description}
      />

      <View className="gap-stack-sm">
        <DateField
          label={isFixo ? 'Início' : 'Data'}
          value={values.occurredOn}
          onChange={(occurredOn) => patch({ occurredOn })}
        />
        {errors.date ? (
          <Text accessibilityRole="alert" className="text-label-sm text-error">
            {errors.date}
          </Text>
        ) : null}
      </View>

      {isFixo ? (
        <RecurrenceFields
          values={{
            frequency: values.frequency,
            endMode: values.endMode,
            endDate: values.endDate,
            occurrences: values.occurrences,
          }}
          errors={{ endDate: errors.endDate, occurrences: errors.occurrences }}
          onChange={patch}
        />
      ) : null}

      {serverError ? (
        <Text accessibilityRole="alert" className="text-label-sm text-error">
          {serverError}
        </Text>
      ) : null}

      <AuthButton
        label={mode === 'create' ? 'Adicionar transação' : 'Salvar'}
        onPress={handleSubmit}
        loading={submitting}
      />

      {mode === 'edit' && onDelete ? (
        <DeleteTransactionButton onDelete={onDelete} deleting={deleting} />
      ) : null}
    </View>
  );
}
