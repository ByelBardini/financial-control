import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AuthButton } from '../auth/AuthButton';
import { FormField } from '../auth/FormField';
import { DateField } from '../DateField';
import { Icon } from '../Icon';
import { SelectField } from '../SelectField';
import { MoneyField } from './MoneyField';
import {
  validateTransferForm,
  type TransferFormErrors,
  type TransferFormValues,
} from '../../lib/transferForm';
import { formatBRL } from '../../lib/money';
import type { IconName } from '../Icon';

type AccountOption = {
  id: string;
  name: string;
  accountType: string;
  icon: IconName;
  dotColor: string;
  balanceCents: number;
};

type TransferFormProps = {
  initial: TransferFormValues;
  accounts: AccountOption[];
  lockDestination?: boolean; // pagar fatura → destino fixo no cartão (sem troca)
  lockOrigin?: boolean; // pagar fatura → origem fixa na conta vinculada ao cartão
  submitting?: boolean;
  serverError?: string;
  onSubmit: (values: TransferFormValues) => void;
};

// Formulário de transferência no padrão de mercado: VALOR em destaque no topo, depois os cartões
// "De" → "Para" com um botão de TROCA (⇅) entre eles que inverte origem/destino, e o saldo de cada
// conta como legenda. Com lockDestination (pagar fatura) o destino fica fixo e a troca some.
export function TransferForm({
  initial,
  accounts,
  lockDestination = false,
  lockOrigin = false,
  submitting = false,
  serverError,
  onSubmit,
}: TransferFormProps) {
  const [values, setValues] = useState<TransferFormValues>(initial);
  const [errors, setErrors] = useState<TransferFormErrors>({});

  function patch(next: Partial<TransferFormValues>) {
    setValues((current) => ({ ...current, ...next }));
  }

  function swap() {
    setValues((current) => ({
      ...current,
      originAccountId: current.destinationAccountId,
      destinationAccountId: current.originAccountId,
    }));
  }

  function handleSubmit() {
    const nextErrors = validateTransferForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSubmit(values);
  }

  // Vale só transfere para vale (mesma classe). Cada seletor mostra só contas da MESMA classe da
  // outra ponta já escolhida (vale↔vale ou conta↔conta); sem a outra ponta escolhida, mostra todas.
  const isVoucherId = (id: string) => accounts.find((a) => a.id === id)?.accountType === 'voucher';
  const optionsForClassOf = (otherId: string) =>
    (otherId === ''
      ? accounts
      : accounts.filter((a) => (a.accountType === 'voucher') === isVoucherId(otherId))
    ).map((a) => ({ value: a.id, label: a.name, icon: a.icon, dotColor: a.dotColor }));
  const originOptions = optionsForClassOf(values.destinationAccountId);
  const destinationOptions = optionsForClassOf(values.originAccountId);
  const balanceOf = (id: string) => accounts.find((a) => a.id === id)?.balanceCents;

  return (
    <View className="gap-gutter">
      <MoneyField
        label="Valor"
        valueCents={values.amountCents}
        onChangeCents={(amountCents) => patch({ amountCents })}
        error={errors.amount}
      />

      <View className="gap-stack-sm">
        <AccountPicker
          label="De"
          value={values.originAccountId}
          balanceCents={balanceOf(values.originAccountId)}
          options={originOptions}
          onChange={(originAccountId) => patch({ originAccountId })}
          placeholder="Conta de origem"
          disabled={lockOrigin}
          error={errors.origin}
        />

        {!lockDestination ? (
          <Pressable
            onPress={swap}
            accessibilityRole="button"
            accessibilityLabel="Trocar origem e destino"
            hitSlop={8}
            className="h-10 w-10 items-center justify-center self-center rounded-full border border-outline-variant bg-surface-container-high"
          >
            <Icon name="swap_horiz" size={20} color="#cbc3d7" />
          </Pressable>
        ) : null}

        <AccountPicker
          label="Para"
          value={values.destinationAccountId}
          balanceCents={balanceOf(values.destinationAccountId)}
          options={destinationOptions}
          onChange={(destinationAccountId) => patch({ destinationAccountId })}
          placeholder="Conta de destino"
          disabled={lockDestination}
          error={errors.destination}
        />
      </View>

      <View className="gap-stack-sm">
        <DateField
          label="Data"
          value={values.occurredOn}
          onChange={(occurredOn) => patch({ occurredOn })}
        />
        {errors.date ? (
          <Text accessibilityRole="alert" className="text-label-sm text-error">
            {errors.date}
          </Text>
        ) : null}
      </View>

      <FormField
        label="Descrição (opcional)"
        value={values.description}
        onChangeText={(description) => patch({ description })}
        placeholder="Ex.: Pagamento da fatura"
      />

      {serverError ? (
        <Text accessibilityRole="alert" className="text-label-sm text-error">
          {serverError}
        </Text>
      ) : null}

      <AuthButton label="Transferir" onPress={handleSubmit} loading={submitting} />
    </View>
  );
}

type SelectOption = { value: string; label: string; icon: IconName; dotColor: string };

type AccountPickerProps = {
  label: string;
  value: string;
  balanceCents?: number;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  error?: string;
};

// AccountPicker é o SelectField de conta + a legenda com o saldo da conta escolhida (padrão dos
// apps de banco: você vê quanto tem na origem antes de transferir).
function AccountPicker({
  label,
  value,
  balanceCents,
  options,
  onChange,
  placeholder,
  disabled,
  error,
}: AccountPickerProps) {
  return (
    <View className="gap-stack-sm">
      <SelectField
        label={label}
        value={value}
        options={options}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        error={error}
      />
      {balanceCents != null ? (
        <Text className="font-geist-medium text-label-sm text-on-surface-variant">
          Saldo: {formatBRL(balanceCents)}
        </Text>
      ) : null}
    </View>
  );
}
