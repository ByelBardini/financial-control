import { Text, View } from 'react-native';
import { MoneyText } from '../MoneyText';
import { SectionHeading } from '../SectionHeading';
import { toneColor } from '../../theme/colors';
import type { AllocationSlice } from '../../types/investimentos';

type AllocationBarProps = {
  allocation: AllocationSlice[];
  hidden: boolean;
};

// Distribuição do portfólio GERAL por classe (Ações/FIIs/Renda Fixa — cripto não entra
// aqui): barra segmentada (cada fatia com largura = percent e cor do tom) + legenda com
// rótulo, % e valor. As larguras vão inline (como ProgressBar/CategoryBar) porque o
// NativeWind não tem classe de largura dinâmica.
export function AllocationBar({ allocation, hidden }: AllocationBarProps) {
  return (
    <View className="gap-stack-md px-container-margin">
      <SectionHeading>Alocação por Classe</SectionHeading>
      <View className="h-3 flex-row overflow-hidden rounded-full bg-surface-container-highest">
        {allocation.map((slice) => (
          <View
            key={slice.assetClass}
            accessibilityLabel={`${slice.label}: ${slice.percent}%`}
            style={{ width: `${slice.percent}%`, backgroundColor: toneColor(slice.tone) }}
          />
        ))}
      </View>
      <View className="gap-stack-sm">
        {allocation.map((slice) => (
          <View key={slice.assetClass} className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-stack-sm">
              <View
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: toneColor(slice.tone) }}
              />
              <Text className="font-geist-medium text-label-sm text-on-surface-variant">
                {slice.label}
              </Text>
              <Text className="font-geist-medium text-label-sm text-on-surface-variant">
                {slice.percent}%
              </Text>
            </View>
            <MoneyText
              cents={slice.valueCents}
              hidden={hidden}
              tone="neutral"
              className="font-geist-medium text-label-sm"
            />
          </View>
        ))}
      </View>
    </View>
  );
}
