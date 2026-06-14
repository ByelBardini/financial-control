import { Text, View } from 'react-native';
import type { Tone } from '../types/dashboard';

type TagStyle = { container: string; text: string };

// Etiqueta tonal da transação ("Sobrevivência", "Inflow Esperado"...). Reusa o estilo
// `bg-<tom>/10 + text-<tom>` dos badges do app (VoucherStatusBadge) — só tokens que já
// existem, sem precisar dos sólidos `on-secondary-container` do mockup.
const TAG_STYLES: Record<Tone, TagStyle> = {
  primary: { container: 'bg-primary/10', text: 'text-primary' },
  secondary: { container: 'bg-secondary/10', text: 'text-secondary' },
  error: { container: 'bg-error/10', text: 'text-error' },
  neutral: { container: 'bg-on-surface-variant/10', text: 'text-on-surface-variant' },
};

type TransactionTagProps = { label: string; tone: Tone };

export function TransactionTag({ label, tone }: TransactionTagProps) {
  const style = TAG_STYLES[tone];
  return (
    <View className={`self-start rounded ${style.container} px-stack-sm py-stack-sm`}>
      <Text className={`font-geist-semibold text-label-sm ${style.text}`}>{label}</Text>
    </View>
  );
}
