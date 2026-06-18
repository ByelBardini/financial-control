import { Pressable, Text, View } from 'react-native';
import { Icon } from './Icon';
import type { Category, TransactionFilters, TransactionPeriod } from '../types/transacoes';

const PERIOD_LABELS: Record<TransactionPeriod, string> = {
  '30d': '30 Dias',
  '3m': '3 Meses',
  '6m': '6 Meses',
  '1y': '1 Ano',
  custom: 'Personalizado',
};

type FilterChipsProps = {
  filters: TransactionFilters;
  categories: Category[];
  total: number;
  onClearPeriod: () => void;
  onRemoveCategory: (id: string) => void;
  onClearQuery: () => void;
  onClearAll: () => void;
};

// Linha de estado dos filtros: contagem de resultados + chips removíveis (período quando
// ≠ 30 Dias, um por categoria selecionada, busca) + "Limpar". Padrão de mercado pra deixar
// claro o que está ativo (Monarch/Copilot).
export function FilterChips({
  filters,
  categories,
  total,
  onClearPeriod,
  onRemoveCategory,
  onClearQuery,
  onClearAll,
}: FilterChipsProps) {
  const query = filters.query.trim();
  const hasActive = filters.period !== '30d' || filters.categoryIds.length > 0 || query !== '';

  return (
    <View className="flex-row flex-wrap items-center gap-stack-sm">
      <Text className="font-geist-medium text-label-sm text-on-surface-variant">
        {total} {total === 1 ? 'transação' : 'transações'}
      </Text>

      {filters.period !== '30d' ? (
        <Chip label={PERIOD_LABELS[filters.period]} onRemove={onClearPeriod} />
      ) : null}

      {filters.categoryIds.map((id) => (
        <Chip
          key={id}
          label={categories.find((c) => c.id === id)?.name ?? 'categoria'}
          onRemove={() => onRemoveCategory(id)}
        />
      ))}

      {query ? <Chip label={`"${query}"`} onRemove={onClearQuery} /> : null}

      {hasActive ? (
        <Pressable
          onPress={onClearAll}
          accessibilityRole="button"
          accessibilityLabel="Limpar filtros"
          hitSlop={8}
          className="min-h-[36px] justify-center px-stack-sm"
        >
          <Text className="font-geist-semibold text-label-sm text-primary">Limpar</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

type ChipProps = { label: string; onRemove: () => void };

function Chip({ label, onRemove }: ChipProps) {
  return (
    <Pressable
      onPress={onRemove}
      accessibilityRole="button"
      accessibilityLabel={`Remover filtro ${label}`}
      hitSlop={8}
      className="min-h-[36px] flex-row items-center gap-stack-sm rounded-full bg-surface-container-highest px-stack-md"
    >
      <Text className="font-geist-semibold text-label-sm text-primary">{label}</Text>
      <Icon name="close" size={14} color="#d0bcff" />
    </Pressable>
  );
}
