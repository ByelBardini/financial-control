import { FormField } from '../auth/FormField';

type QuantityFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  testID?: string;
};

// sanitizeQuantity normaliza a digitação pro formato do backend: vírgula→ponto, só dígitos e UM
// ponto decimal com até 8 casas (rejeita negativo/científico). NÃO força "> 0" — isso é da
// validação; aqui é só barrar caractere inválido enquanto digita. Sem parse de float.
export function sanitizeQuantity(raw: string): string {
  const cleaned = raw.replace(',', '.').replace(/[^0-9.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot === -1) return cleaned;
  const intPart = cleaned.slice(0, firstDot);
  const decPart = cleaned.slice(firstDot + 1).replace(/\./g, '').slice(0, 8);
  return `${intPart}.${decPart}`;
}

// Campo de QUANTIDADE fracionária (string decimal, até 8 casas) — NÃO é máscara de centavos (essa
// é o MoneyField). Cripto compra/vende fração; o valor trafega como string (sem float, ver money.md).
export function QuantityField({ label, value, onChangeText, error, testID }: QuantityFieldProps) {
  return (
    <FormField
      label={label}
      value={value}
      onChangeText={(text) => onChangeText(sanitizeQuantity(text))}
      placeholder="0"
      keyboardType="decimal-pad"
      error={error}
      testID={testID}
    />
  );
}
