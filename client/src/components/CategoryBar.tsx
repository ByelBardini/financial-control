import { Text, View } from 'react-native';
import { MoneyText } from './MoneyText';
import { ProgressBar } from './ProgressBar';
import type { CategorySpend } from '../types/dashboard';

type CategoryBarProps = {
  category: CategorySpend;
  hidden: boolean;
};

// Categoria de gasto: rótulo + valor + barra. Compõe ProgressBar (não
// reimplementa a barra).
export function CategoryBar({ category, hidden }: CategoryBarProps) {
  return (
    <View className="gap-stack-sm">
      <View className="flex-row items-center justify-between">
        <Text className="font-geist-medium text-label-sm text-on-surface-variant">
          {category.label}
        </Text>
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
    </View>
  );
}
