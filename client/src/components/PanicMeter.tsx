import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { toneColor } from '../theme/colors';
import type { PanicMeter as PanicMeterData } from '../types/contas';

type PanicMeterProps = {
  panic: PanicMeterData;
  caption?: string;
};

// Medidor de pânico: barra-gradiente (limão→amarelo→erro) preenchida até percent,
// com nível à direita, extremos embaixo e nota opcional. Anuncia o valor via
// accessibilityValue (não só pela cor).
export function PanicMeter({ panic, caption }: PanicMeterProps) {
  const clamped = Math.max(0, Math.min(100, panic.percent));
  return (
    <View className="gap-stack-sm">
      <View className="flex-row items-center justify-between">
        {caption ? (
          <Text className="font-geist-medium text-label-sm text-on-surface-variant">{caption}</Text>
        ) : null}
        <Text
          className="font-geist-semibold text-label-sm"
          style={{ color: toneColor(panic.levelTone) }}
        >
          {panic.levelLabel}
        </Text>
      </View>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: clamped }}
        className="h-3 w-full overflow-hidden rounded-full bg-surface-container-highest"
      >
        <LinearGradient
          colors={['#9ddf2e', '#f5c518', '#ffb4ab']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: `${clamped}%`, height: '100%' }}
        />
      </View>
      <View className="flex-row justify-between">
        <Text className="font-geist-medium text-label-sm uppercase text-on-surface-variant">
          {panic.lowLabel}
        </Text>
        <Text className="font-geist-medium text-label-sm uppercase text-on-surface-variant">
          {panic.highLabel}
        </Text>
      </View>
      {panic.note ? (
        <Text className="font-geist-medium text-label-sm text-on-surface-variant">
          {panic.note}
        </Text>
      ) : null}
    </View>
  );
}
