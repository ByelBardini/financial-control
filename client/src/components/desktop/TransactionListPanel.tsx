import { Text, View } from 'react-native';
import { DesktopTransactionRow } from './DesktopTransactionRow';
import { CategoryFilter } from '../CategoryFilter';
import { FilterChips } from '../FilterChips';
import { Pagination } from '../Pagination';
import { PeriodFilter } from '../PeriodFilter';
import type { TransactionControls } from '../../hooks/useTransactionFilters';
import type { Category, Transaction } from '../../types/transacoes';

type TransactionListPanelProps = {
  transactions: Transaction[];
  total: number;
  hidden: boolean;
  controls: TransactionControls;
  categories: Category[];
  page: number;
  pageCount: number;
  onPrev: () => void;
  onNext: () => void;
};

// Painel principal do desktop: barra de filtros (abas de tempo + categoria) + chips de
// estado, a lista filtrada/paginada e o rodapé de paginação numerada.
export function TransactionListPanel({
  transactions,
  total,
  hidden,
  controls,
  categories,
  page,
  pageCount,
  onPrev,
  onNext,
}: TransactionListPanelProps) {
  return (
    <View>
      <View className="flex-row items-center justify-between gap-stack-md border-b border-grid-line p-stack-lg">
        <PeriodFilter
          value={controls.filters.period}
          from={controls.filters.from}
          to={controls.filters.to}
          onChange={controls.setPeriod}
          onFromChange={controls.setFrom}
          onToChange={controls.setTo}
        />
        <CategoryFilter
          categories={categories}
          value={controls.filters.categoryIds}
          onToggle={controls.toggleCategory}
          onClear={controls.clearCategory}
        />
      </View>

      <View className="border-b border-grid-line px-stack-lg py-stack-md">
        <FilterChips
          filters={controls.filters}
          categories={categories}
          total={total}
          onClearPeriod={controls.clearPeriod}
          onRemoveCategory={controls.toggleCategory}
          onClearQuery={controls.clearQuery}
          onClearAll={controls.clearAll}
        />
      </View>

      {transactions.length === 0 ? (
        <View className="p-stack-lg">
          <Text className="font-geist-medium text-label-md text-on-surface-variant">
            Nenhuma transação encontrada.
          </Text>
        </View>
      ) : (
        <View>
          {transactions.map((transaction) => (
            <DesktopTransactionRow key={transaction.id} transaction={transaction} hidden={hidden} />
          ))}
        </View>
      )}

      <Pagination page={page} pageCount={pageCount} onPrev={onPrev} onNext={onNext} />
    </View>
  );
}
