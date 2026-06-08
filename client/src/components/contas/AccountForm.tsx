import { useState } from 'react';
import { Text, View } from 'react-native';
import { AuthButton } from '../auth/AuthButton';
import { FormField } from '../auth/FormField';
import { AccountTypeSelect } from './AccountTypeSelect';
import { AppearancePicker } from './AppearancePicker';
import { ArchiveAccountButton } from './ArchiveAccountButton';
import { MoneyField } from './MoneyField';
import {
  accountTypeMeta,
  validateAccountForm,
  type AccountFormErrors,
  type AccountFormValues,
} from '../../lib/accountForm';
import type { IconName } from '../Icon';
import type { AccountType } from '../../types/accounts';

type AccountFormProps = {
  mode: 'create' | 'edit';
  initial: AccountFormValues;
  submitting?: boolean;
  serverError?: string;
  onSubmit: (values: AccountFormValues) => void;
  onArchive?: () => void;
  archiving?: boolean;
};

// Formulário de conta (criar/editar). Modo editar não mostra saldo (nunca editável)
// e ganha o botão "Arquivar" com confirmação. Valida no client; o parent (modal)
// mapeia os valores e chama a mutation, devolvendo submitting/serverError.
export function AccountForm({
  mode,
  initial,
  submitting = false,
  serverError,
  onSubmit,
  onArchive,
  archiving = false,
}: AccountFormProps) {
  const [values, setValues] = useState<AccountFormValues>(initial);
  const [errors, setErrors] = useState<AccountFormErrors>({});

  function patch(next: Partial<AccountFormValues>) {
    setValues((current) => ({ ...current, ...next }));
  }

  function handleTypeChange(accountType: AccountType) {
    const meta = accountTypeMeta(accountType);
    patch({ accountType, icon: meta.defaultIcon, dotColor: meta.defaultColor });
  }

  function handleSubmit() {
    const nextErrors = validateAccountForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSubmit(values);
  }

  const isCard = values.accountType === 'credit_card';

  return (
    <View className="gap-gutter">
      <AccountTypeSelect value={values.accountType} onChange={handleTypeChange} />

      <FormField
        label="Nome"
        value={values.name}
        onChangeText={(name) => patch({ name })}
        placeholder="Ex.: Nubank"
        error={errors.name}
      />

      {mode === 'create' && !isCard ? (
        <MoneyField
          label="Saldo inicial"
          valueCents={values.openingBalanceCents}
          onChangeCents={(openingBalanceCents) => patch({ openingBalanceCents })}
        />
      ) : null}

      {isCard ? (
        <MoneyField
          label="Limite de crédito"
          valueCents={values.creditLimitCents}
          onChangeCents={(creditLimitCents) => patch({ creditLimitCents })}
          error={errors.creditLimit}
        />
      ) : null}

      <FormField
        label="Subtítulo (opcional)"
        value={values.subtitle}
        onChangeText={(subtitle) => patch({ subtitle })}
        placeholder="Ex.: Conta Corrente • Final 4022"
      />

      <AppearancePicker
        dotColor={values.dotColor}
        icon={values.icon}
        onChangeColor={(dotColor) => patch({ dotColor })}
        onChangeIcon={(icon: IconName) => patch({ icon })}
      />

      {serverError ? (
        <Text accessibilityRole="alert" className="text-label-sm text-error">
          {serverError}
        </Text>
      ) : null}

      <AuthButton
        label={mode === 'create' ? 'Criar conta' : 'Salvar'}
        onPress={handleSubmit}
        loading={submitting}
      />

      {mode === 'edit' && onArchive ? (
        <ArchiveAccountButton onArchive={onArchive} archiving={archiving} />
      ) : null}
    </View>
  );
}
