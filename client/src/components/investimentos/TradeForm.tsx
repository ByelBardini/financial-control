import { useState } from 'react';
import { Text, View } from 'react-native';
import { AuthButton } from '../auth/AuthButton';
import { DateField } from '../DateField';
import { SelectField } from '../SelectField';
import { MoneyField } from '../contas/MoneyField';
import { QuantityField } from './QuantityField';
import {
  isPositiveDecimal,
  validateTradeForm,
  type TradeFormErrors,
  type TradeFormValues,
} from '../../lib/investmentTradeForm';
import { formatBRL } from '../../lib/money';
import type { IconName } from '../Icon';

type AccountOption = { id: string; name: string; icon: IconName; dotColor: string };

type TradeFormProps = {
  ticker: string;
  initial: TradeFormValues;
  accounts: AccountOption[];
  submitting?: boolean;
  serverError?: string;
  onSubmit: (values: TradeFormValues) => void;
};

// estimatedTotalCents: PRÉVIA de exibição (quantidade × preço). O valor REAL é calculado no SQL
// (NUMERIC) no backend — aqui é só uma estimativa pro usuário conferir, então o float é tolerável.
function estimatedTotalCents(quantity: string, unitPriceCents: number): number {
  if (!isPositiveDecimal(quantity)) return 0;
  return Math.round(Number(quantity) * unitPriceCents);
}

// Formulário de COMPRA/VENDA (só criação — operação não se edita, só exclui). O lado vem travado
// (buy/sell) do modal. A conta é "de origem" (debita) na compra e "de destino" (credita) na venda;
// mostra o total estimado. Valida no client; o parent (modal) mapeia + chama a mutation.
export function TradeForm({
  ticker,
  initial,
  accounts,
  submitting = false,
  serverError,
  onSubmit,
}: TradeFormProps) {
  const [values, setValues] = useState<TradeFormValues>(initial);
  const [errors, setErrors] = useState<TradeFormErrors>({});

  function patch(next: Partial<TradeFormValues>) {
    setValues((current) => ({ ...current, ...next }));
  }

  function handleSubmit() {
    const nextErrors = validateTradeForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSubmit(values);
  }

  const isBuy = values.side === 'buy';
  const accountOptions = accounts.map((a) => ({
    value: a.id,
    label: a.name,
    icon: a.icon,
    dotColor: a.dotColor,
  }));
  const total = estimatedTotalCents(values.quantity, values.unitPriceCents);

  return (
    <View className="gap-gutter">
      <QuantityField
        label="Quantidade"
        value={values.quantity}
        onChangeText={(quantity) => patch({ quantity })}
        error={errors.quantity}
      />

      <MoneyField
        label="Preço unitário"
        valueCents={values.unitPriceCents}
        onChangeCents={(unitPriceCents) => patch({ unitPriceCents })}
        error={errors.unitPrice}
      />

      {total > 0 ? (
        <Text className="font-geist-medium text-label-sm text-on-surface-variant">
          Total estimado: {formatBRL(total)}
        </Text>
      ) : null}

      <SelectField
        label={isBuy ? 'Conta de origem' : 'Conta de destino'}
        value={values.accountId}
        options={accountOptions}
        onChange={(accountId) => patch({ accountId })}
        placeholder="Escolha uma conta"
        error={errors.account}
      />

      <View className="gap-stack-sm">
        <DateField label="Data" value={values.tradedOn} onChange={(tradedOn) => patch({ tradedOn })} />
        {errors.date ? (
          <Text accessibilityRole="alert" className="text-label-sm text-error">
            {errors.date}
          </Text>
        ) : null}
      </View>

      {serverError ? (
        <Text accessibilityRole="alert" className="text-label-sm text-error">
          {serverError}
        </Text>
      ) : null}

      <AuthButton
        label={isBuy ? `Comprar ${ticker}` : `Vender ${ticker}`}
        onPress={handleSubmit}
        loading={submitting}
      />
    </View>
  );
}
