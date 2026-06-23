import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AuthButton } from '../auth/AuthButton';
import { DateField } from '../DateField';
import { SelectField } from '../SelectField';
import { MoneyField } from '../contas/MoneyField';
import { QuantityField } from './QuantityField';
import {
  deriveQuantityFromValue,
  isPositiveDecimal,
  validateTradeForm,
  type TradeFormErrors,
  type TradeFormValues,
  type TradeInputMode,
} from '../../lib/investmentTradeForm';
import { formatBRL } from '../../lib/money';
import type { IconName } from '../Icon';

type AccountOption = { id: string; name: string; icon: IconName; dotColor: string };

type TradeFormProps = {
  ticker: string;
  isCrypto: boolean;
  initial: TradeFormValues;
  accounts: AccountOption[];
  submitting?: boolean;
  serverError?: string;
  onSubmit: (values: TradeFormValues) => void;
};

const MODE_OPTIONS: { value: TradeInputMode; label: string }[] = [
  { value: 'value', label: 'Por valor' },
  { value: 'quantity', label: 'Por quantidade' },
];

// estimatedTotalCents: PRÉVIA de exibição (quantidade × preço) no modo quantidade. O valor REAL é
// NUMERIC no SQL no backend — aqui é só uma estimativa pro usuário conferir.
function estimatedTotalCents(quantity: string, unitPriceCents: number): number {
  if (!isPositiveDecimal(quantity)) return 0;
  return Math.round(Number(quantity) * unitPriceCents);
}

// Formulário de COMPRA/VENDA (só criação — operação não se edita, só exclui). O lado vem travado do
// modal. O preço unitário já vem do preço atual do ativo (editável). O usuário informa por QUANTIDADE
// (total sai sozinho) ou — só em cripto — por VALOR em R$ (a quantidade sai sozinha). A conta é "de
// origem" (debita) na compra e "de destino" (credita) na venda. Valida no client; o parent (modal)
// mapeia + chama a mutation.
export function TradeForm({
  ticker,
  isCrypto,
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
  const byValue = values.mode === 'value';
  const accountOptions = accounts.map((a) => ({
    value: a.id,
    label: a.name,
    icon: a.icon,
    dotColor: a.dotColor,
  }));
  const derivedQuantity = deriveQuantityFromValue(values.amountCents, values.unitPriceCents);
  const total = estimatedTotalCents(values.quantity, values.unitPriceCents);

  return (
    <View className="gap-gutter">
      {isCrypto ? (
        <View className="gap-stack-sm">
          <Text className="font-geist-semibold text-label-sm uppercase text-on-surface-variant">
            Informar por
          </Text>
          <View className="flex-row gap-stack-sm">
            {MODE_OPTIONS.map((o) => {
              const selected = o.value === values.mode;
              return (
                <Pressable
                  key={o.value}
                  onPress={() => patch({ mode: o.value })}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={o.label}
                  className={`min-h-11 flex-1 items-center justify-center rounded-lg border py-stack-md ${
                    selected ? 'border-primary bg-surface-container-highest' : 'border-outline-variant'
                  }`}
                >
                  <Text
                    className={`font-geist-semibold text-label-md ${selected ? 'text-primary' : 'text-on-surface-variant'}`}
                  >
                    {o.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <MoneyField
        label="Preço unitário"
        valueCents={values.unitPriceCents}
        onChangeCents={(unitPriceCents) => patch({ unitPriceCents })}
        error={errors.unitPrice}
      />

      {byValue ? (
        <View className="gap-stack-sm">
          <MoneyField
            label={isBuy ? 'Valor a investir' : 'Valor a resgatar'}
            valueCents={values.amountCents}
            onChangeCents={(amountCents) => patch({ amountCents })}
            error={errors.amount}
          />
          {derivedQuantity ? (
            <Text className="font-geist-medium text-label-sm text-on-surface-variant">
              ≈ {derivedQuantity} {ticker}
            </Text>
          ) : null}
        </View>
      ) : (
        <View className="gap-stack-sm">
          <QuantityField
            label="Quantidade"
            value={values.quantity}
            onChangeText={(quantity) => patch({ quantity })}
            error={errors.quantity}
          />
          {total > 0 ? (
            <Text className="font-geist-medium text-label-sm text-on-surface-variant">
              Total estimado: {formatBRL(total)}
            </Text>
          ) : null}
        </View>
      )}

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
