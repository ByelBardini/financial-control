import { Text } from 'react-native';
import { formatBRL } from '../lib/money';
import type { Tone } from '../types/dashboard';

const MASK = 'R$ ••••';

const toneClass: Record<Tone, string> = {
  primary: 'text-primary',
  secondary: 'text-secondary',
  error: 'text-error',
  neutral: 'text-on-surface',
};

type MoneyTextProps = {
  cents: number;
  hidden?: boolean;
  tone?: Tone;
  className?: string;
  testID?: string;
};

// Formata centavos só na borda da UI. Quando hidden, renderiza a máscara com
// accessibilityLabel "valor oculto" — senão o leitor de tela soletra os bullets.
export function MoneyText({
  cents,
  hidden = false,
  tone = 'neutral',
  className = '',
  testID,
}: MoneyTextProps) {
  return (
    <Text
      testID={testID}
      accessibilityLabel={hidden ? 'valor oculto' : undefined}
      className={`${toneClass[tone]} ${className}`}
    >
      {hidden ? MASK : formatBRL(cents)}
    </Text>
  );
}
