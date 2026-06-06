import { View } from 'react-native';
import { CategoryBar } from './CategoryBar';
import { SectionHeading } from './SectionHeading';
import type { CategorySpend } from '../types/dashboard';

type CategorySpendSectionProps = {
  categories: CategorySpend[];
  hidden: boolean;
};

export function CategorySpendSection({ categories, hidden }: CategorySpendSectionProps) {
  return (
    <View className="gap-stack-md border-b border-outline-variant px-container-margin pb-stack-lg">
      <SectionHeading>Gastos por Categoria</SectionHeading>
      {categories.map((category) => (
        <CategoryBar key={category.id} category={category} hidden={hidden} />
      ))}
    </View>
  );
}
