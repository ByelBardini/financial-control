import { View } from 'react-native';
import type { Tone } from '../types/dashboard';

const fillClass: Record<Tone, string> = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  error: 'bg-error',
  neutral: 'bg-on-surface',
};

type ProgressBarProps = {
  percent: number;
  tone?: Tone;
  testID?: string;
};

// Barra fina (trilho + preenchimento). Comunica o valor ao leitor de tela via
// accessibilityValue (0–100), não só pela largura. Largura é estilo inline
// porque NativeWind não gera classes de porcentagem arbitrária em runtime.
export function ProgressBar({ percent, tone = 'neutral', testID }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: clamped }}
      className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high"
    >
      <View
        testID={testID}
        className={`h-full ${fillClass[tone]}`}
        style={{ width: `${clamped}%` }}
      />
    </View>
  );
}
