import { useState } from 'react';
import { FormField } from '../auth/FormField';
import { digitsToCents, formatCentsInput } from '../../lib/money';

type MoneyFieldProps = {
  label: string;
  valueCents: number;
  onChangeCents: (cents: number) => void;
  error?: string;
  testID?: string;
};

// Campo monetário com máscara de centavos: o "R$" fica fixo e cada dígito entra
// pela direita ("1"→0,01, "10"→0,10, "100"→1,00). Entrega centavos (inteiro) via
// onChangeCents. Reformata o texto a cada tecla a partir do valor acumulado.
export function MoneyField({ label, valueCents, onChangeCents, error, testID }: MoneyFieldProps) {
  const [text, setText] = useState(() => formatCentsInput(valueCents));

  function handleChange(next: string) {
    const cents = digitsToCents(next);
    setText(formatCentsInput(cents));
    onChangeCents(cents);
  }

  return (
    <FormField
      label={label}
      value={text}
      onChangeText={handleChange}
      placeholder="0,00"
      keyboardType="numeric"
      prefix="R$"
      error={error}
      testID={testID}
    />
  );
}
