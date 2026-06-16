import { useEffect, useState } from 'react';
import { Text, View, type LayoutChangeEvent } from 'react-native';
import { DesktopTransactionRow } from './DesktopTransactionRow';
import { CategoryFilter } from '../CategoryFilter';
import { FilterChips } from '../FilterChips';
import { Pagination } from '../Pagination';
import { PeriodFilter } from '../PeriodFilter';
import { rowsForHeight } from '../../lib/fitRows';
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
  onEdit?: (id: string) => void;
  onRowsFit?: (rows: number) => void;
};

// Painel principal do desktop: barra de filtros (abas de tempo + categoria) + chips de
// estado, a lista filtrada/paginada e o rodapé de paginação numerada. O corpo da lista é
// flex-1 (preenche a coluna) e mede a própria altura + a altura ocupada pelas linhas pra
// reportar via onRowsFit quantas linhas cabem na tela (o pai usa isso como pageSize).
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
  onEdit,
  onRowsFit,
}: TransactionListPanelProps) {
  const [bodyHeight, setBodyHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

  // Recalcula quando qualquer medida chega (a ordem dos onLayout não é garantida); só reporta
  // quando dá pra calcular (rows > 0). O pai trava no primeiro valor (não recalcula no resize).
  useEffect(() => {
    if (!onRowsFit) return;
    const rows = rowsForHeight(bodyHeight, contentHeight, transactions.length);
    if (rows > 0) onRowsFit(rows);
  }, [bodyHeight, contentHeight, transactions.length, onRowsFit]);

  return (
    <View className="flex-1">
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

      <View
        className="min-h-0 flex-1 overflow-hidden"
        onLayout={(e: LayoutChangeEvent) => setBodyHeight(e.nativeEvent.layout.height)}
      >
        {transactions.length === 0 ? (
          <View className="p-stack-lg">
            <Text className="font-geist-medium text-label-md text-on-surface-variant">
              Nenhuma transação encontrada.
            </Text>
          </View>
        ) : (
          <View onLayout={(e: LayoutChangeEvent) => setContentHeight(e.nativeEvent.layout.height)}>
            {transactions.map((transaction) => (
              <DesktopTransactionRow
                key={transaction.id}
                transaction={transaction}
                hidden={hidden}
                onPress={onEdit ? () => onEdit(transaction.id) : undefined}
              />
            ))}
          </View>
        )}
      </View>

      <Pagination page={page} pageCount={pageCount} onPrev={onPrev} onNext={onNext} />
    </View>
  );
}
