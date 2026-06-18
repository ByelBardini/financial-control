import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DividasPanel } from './DividasPanel';
import { FluxoCaixaBar } from './FluxoCaixaBar';
import { RecorrenciasPanel } from './RecorrenciasPanel';
import { SideNav } from './SideNav';
import { TransacoesHeader } from './TransacoesHeader';
import { TransactionListPanel } from './TransactionListPanel';
import { QuerySection } from '../QuerySection';
import {
  useCashflowSummary,
  useCategories,
  useFutureDebts,
  useRecurrences,
  useTransactionsPage,
} from '../../hooks/useTransacoesQueries';
import type { TransactionControls } from '../../hooks/useTransactionFilters';
import type { AppRoute } from '../../navigation/routes';
import type { MenuAnchor } from '../transacoes/NewTransactionMenu';

type DesktopTransacoesProps = {
  hidden: boolean;
  onToggleHidden: () => void;
  controls: TransactionControls;
  route?: AppRoute;
  onNavigate?: (route: AppRoute) => void;
  onLogout?: () => void;
  onCreateTransaction?: (anchor?: MenuAnchor) => void;
  onEditTransaction?: (id: string) => void;
};

// Layout enterprise da tela de Transações: rail fixo + header (com busca) + faixa de
// fluxo de caixa + grid 2/3 (lista filtrada/paginada) / 1/3 (Recorrências + Dívidas).
// A página volta a 1 quando os filtros mudam; o saldo/recorrências/dívidas não paginam.
export function DesktopTransacoes({
  hidden,
  onToggleHidden,
  controls,
  route = 'transacoes',
  onNavigate,
  onLogout,
  onCreateTransaction,
  onEditTransaction,
}: DesktopTransacoesProps) {
  const [page, setPage] = useState(1);
  // Reseta a página quando os filtros mudam (ajuste de estado no render — sem effect).
  const [appliedFilters, setAppliedFilters] = useState(controls.filters);
  if (appliedFilters !== controls.filters) {
    setAppliedFilters(controls.filters);
    setPage(1);
  }

  // pageSize calculado pela altura da tela: undefined no 1º load (server usa o default) e
  // travado no primeiro valor medido (decisão: não recalcular ao redimensionar).
  const [pageSize, setPageSize] = useState<number | undefined>(undefined);
  const lockRows = useCallback((rows: number) => setPageSize((prev) => prev ?? rows), []);

  const summary = useCashflowSummary();
  const list = useTransactionsPage(controls.filters, page, pageSize);
  const recurrences = useRecurrences();
  const debts = useFutureDebts();
  const categories = useCategories();

  return (
    <View className="flex-1 flex-row bg-surface-container-lowest">
      <LinearGradient
        colors={['rgba(6,78,59,0.18)', 'transparent', 'rgba(76,29,149,0.18)']}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <SideNav currentRoute={route} onNavigate={onNavigate} onLogout={onLogout} />
      <View className="flex-1">
        <TransacoesHeader
          hidden={hidden}
          onToggleHidden={onToggleHidden}
          searchText={controls.searchText}
          onSearchChange={controls.setSearchText}
          onCreate={onCreateTransaction}
        />

        <QuerySection query={summary} label="o fluxo de caixa">
          {(data) => <FluxoCaixaBar summary={data} hidden={hidden} />}
        </QuerySection>

        <View className="min-h-0 flex-1 flex-row border-t border-grid-line">
          <View className="min-h-0 border-r border-grid-line" style={{ flex: 2 }}>
            <QuerySection query={list} label="as transações">
              {(data) => (
                <TransactionListPanel
                  transactions={data.items}
                  total={data.total}
                  hidden={hidden}
                  controls={controls}
                  categories={categories.data ?? []}
                  page={data.page}
                  pageCount={data.pageCount}
                  onPrev={() => setPage((p) => Math.max(1, p - 1))}
                  onNext={() => setPage((p) => p + 1)}
                  onEdit={onEditTransaction}
                  onRowsFit={lockRows}
                />
              )}
            </QuerySection>
          </View>

          <ScrollView className="min-h-0 flex-1">
            <QuerySection query={recurrences} label="as recorrências">
              {(data) => <RecorrenciasPanel recurrences={data} hidden={hidden} />}
            </QuerySection>
            <View className="border-t border-grid-line">
              <QuerySection query={debts} label="as dívidas futuras">
                {(data) => <DividasPanel debts={data} hidden={hidden} />}
              </QuerySection>
            </View>
          </ScrollView>
        </View>
      </View>
    </View>
  );
}
