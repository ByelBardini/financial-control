import { Text, View } from 'react-native';
import { CategoryBar } from '../CategoryBar';
import type { CategorySpend } from '../../types/dashboard';

type CategoriasPanelProps = {
  categories: CategorySpend[];
  hidden: boolean;
};

// Coluna larga (8/12) de gastos por categoria, reaproveitando CategoryBar.
export function CategoriasPanel({ categories, hidden }: CategoriasPanelProps) {
  return (
    <View className="gap-stack-md p-stack-lg">
      <Text className="font-geist-medium text-label-sm uppercase text-on-surface-variant">
        Gastos por Categoria
      </Text>
      <View className="gap-stack-md">
        {categories.map((category) => (
          <CategoryBar key={category.id} category={category} hidden={hidden} />
        ))}
      </View>
    </View>
  );
}
