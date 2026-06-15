import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNav } from './BottomNav';
import { CashflowSummary } from './CashflowSummary';
import { CategoryFilter } from './CategoryFilter';
import { FilterChips } from './FilterChips';
import { FutureDebtRow } from './FutureDebtRow';
import { PanicMeter } from './PanicMeter';
import { PeriodFilter } from './PeriodFilter';
import { QuerySection } from './QuerySection';
import { RecurrenceRow } from './RecurrenceRow';
import { SectionError } from './SectionError';
import { SectionHeading } from './SectionHeading';
import { SectionSkeleton } from './SectionSkeleton';
import { TopBar } from './TopBar';
import { TransactionRow } from './TransactionRow';
import { TransactionSearch } from './TransactionSearch';
import {
  useCashflowSummary,
  useCategories,
  useFutureDebts,
  useRecurrences,
  useTransactionsInfinite,
} from '../hooks/useTransacoesQueries';
import type { TransactionControls } from '../hooks/useTransactionFilters';
import type { AppRoute } from '../navigation/routes';

type MobileTransacoesProps = {
  hidden: boolean;
  onToggleHidden: () => void;
  controls: TransactionControls;
  route?: AppRoute;
  onNavigate?: (route: AppRoute) => void;
  onLogout?: () => void;
};

// Pilha vertical do mobile (Transações). A seção do log tem busca + filtros (tempo/
// categoria) + chips e pagina por "Carregar mais" (useInfiniteQuery acumula as páginas).
// Recorrências/Dívidas seguem seções abaixo. BottomNav fixo respeitando o safe-area.
export function MobileTransacoes({
  hidden,
  onToggleHidden,
  controls,
  route = 'transacoes',
  onNavigate,
  onLogout,
}: MobileTransacoesProps) {
  const insets = useSafeAreaInsets();
  const summary = useCashflowSummary();
  const list = useTransactionsInfinite(controls.filters);
  const recurrences = useRecurrences();
  const debts = useFutureDebts();
  const categories = useCategories();

  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const total = list.data?.pages[0]?.total ?? 0;

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <TopBar hidden={hidden} onToggleHidden={onToggleHidden} onLogout={onLogout} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ gap: 24, paddingBottom: insets.bottom + 96 }}
      >
        <QuerySection query={summary} label="o fluxo de caixa">
          {(data) => (
            <View className="gap-stack-lg px-container-margin">
              <SectionHeading>Fluxo de Caixa</SectionHeading>
              <CashflowSummary summary={data} hidden={hidden} />
              <View className="rounded-xl border border-error/20 bg-surface-container p-stack-md">
                <PanicMeter panic={data.collapse} caption="Previsão de Colapso" />
              </View>
            </View>
          )}
        </QuerySection>

        <View className="gap-stack-md px-container-margin">
          <SectionHeading>Transações</SectionHeading>
          <TransactionSearch value={controls.searchText} onChange={controls.setSearchText} />
          <View className="flex-row flex-wrap items-center gap-stack-sm">
            <PeriodFilter
              value={controls.filters.period}
              from={controls.filters.from}
              to={controls.filters.to}
              onChange={controls.setPeriod}
              onFromChange={controls.setFrom}
              onToChange={controls.setTo}
            />
            <CategoryFilter
              categories={categories.data ?? []}
              value={controls.filters.categoryIds}
              onToggle={controls.toggleCategory}
              onClear={controls.clearCategory}
            />
          </View>
          <FilterChips
            filters={controls.filters}
            categories={categories.data ?? []}
            total={total}
            onClearPeriod={controls.clearPeriod}
            onRemoveCategory={controls.toggleCategory}
            onClearQuery={controls.clearQuery}
            onClearAll={controls.clearAll}
          />

          {list.isPending ? (
            <SectionSkeleton />
          ) : list.isError ? (
            <SectionError label="as transações" onRetry={() => void list.refetch()} />
          ) : items.length === 0 ? (
            <Text className="font-geist-medium text-label-md text-on-surface-variant">
              Nenhuma transação encontrada.
            </Text>
          ) : (
            <>
              {items.map((transaction) => (
                <TransactionRow key={transaction.id} transaction={transaction} hidden={hidden} />
              ))}
              {list.hasNextPage ? (
                <Pressable
                  onPress={() => void list.fetchNextPage()}
                  disabled={list.isFetchingNextPage}
                  accessibilityRole="button"
                  accessibilityLabel="Carregar mais"
                  accessibilityState={{ disabled: list.isFetchingNextPage }}
                  className="min-h-[44px] items-center justify-center rounded-xl border border-outline-variant"
                >
                  <Text className="font-geist-semibold text-label-md text-primary">
                    {list.isFetchingNextPage ? 'Carregando…' : 'Carregar mais'}
                  </Text>
                </Pressable>
              ) : null}
            </>
          )}
        </View>

        <QuerySection query={recurrences} label="as recorrências">
          {(data) => (
            <View className="gap-stack-md px-container-margin">
              <SectionHeading>Recorrências</SectionHeading>
              {data.map((recurrence) => (
                <RecurrenceRow key={recurrence.id} recurrence={recurrence} hidden={hidden} />
              ))}
            </View>
          )}
        </QuerySection>

        <QuerySection query={debts} label="as dívidas futuras">
          {(data) => (
            <View className="gap-stack-md px-container-margin">
              <SectionHeading>Dívidas Futuras</SectionHeading>
              {data.map((debt) => (
                <FutureDebtRow key={debt.id} debt={debt} hidden={hidden} />
              ))}
            </View>
          )}
        </QuerySection>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0" style={{ paddingBottom: insets.bottom }}>
        <BottomNav currentRoute={route} onNavigate={onNavigate} />
      </View>
    </View>
  );
}
