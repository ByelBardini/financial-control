import { Pressable, Text, View } from 'react-native';
import { MoneyText } from './MoneyText';
import { ProgressBar } from './ProgressBar';
import { useHoverReveal } from '../hooks/useHoverReveal';
import type { CategorySpend } from '../types/dashboard';

type CategoryBarProps = {
  category: CategorySpend;
  hidden: boolean;
};

// Categoria de gasto: rótulo + valor + barra. Compõe ProgressBar (não
// reimplementa a barra). Hover (PC) ou toque (mobile) revela o share (% do
// total) ao lado do valor — useHoverReveal cuida do hover/toque. O Pressable é
// accessible={false} de propósito: a ProgressBar interna já anuncia o share via
// accessibilityValue, então não colapsamos a árvore num único botão.
export function CategoryBar({ category, hidden }: CategoryBarProps) {
  const { revealed, onHoverIn, onHoverOut, onPress } = useHoverReveal();
  return (
    <Pressable
      testID={`category-bar-${category.id}`}
      accessible={false}
      className="gap-stack-sm"
      onHoverIn={onHoverIn}
      onHoverOut={onHoverOut}
      onPress={onPress}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-stack-sm">
          <Text className="font-geist-medium text-label-sm text-on-surface-variant">
            {category.label}
          </Text>
          {revealed && (
            <Text
              testID={`share-${category.id}`}
              className="font-geist-medium text-label-sm text-on-surface-variant"
            >
              {category.percent}%
            </Text>
          )}
        </View>
        <MoneyText
          cents={category.amountCents}
          hidden={hidden}
          tone={category.tone}
          className="font-geist-medium text-label-sm"
        />
      </View>
      <ProgressBar
        percent={category.percent}
        tone={category.tone}
        testID={`bar-fill-${category.id}`}
      />
    </Pressable>
  );
}
