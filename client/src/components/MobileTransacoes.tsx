import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNav } from './BottomNav';
import { CashflowSummary } from './CashflowSummary';
import { FutureDebtRow } from './FutureDebtRow';
import { PanicMeter } from './PanicMeter';
import { QuerySection } from './QuerySection';
import { RecurrenceRow } from './RecurrenceRow';
import { SectionHeading } from './SectionHeading';
import { TopBar } from './TopBar';
import { TransactionFilterTabs } from './TransactionFilterTabs';
import { TransactionRow } from './TransactionRow';
import {
  useCashflowSummary,
  useFutureDebts,
  useRecurrences,
  useTransactions,
} from '../hooks/useTransacoesQueries';
import type { AppRoute } from '../navigation/routes';

type MobileTransacoesProps = {
  hidden: boolean;
  onToggleHidden: () => void;
  route?: AppRoute;
  onNavigate?: (route: AppRoute) => void;
  onLogout?: () => void;
};

// Pilha vertical do mobile (Transações). Cada seção é uma query independente
// (loading/erro por seção via QuerySection). Read-only nesta passada: as abas de
// filtro são visuais. BottomNav fixo respeitando o safe-area.
export function MobileTransacoes({
  hidden,
  onToggleHidden,
  route = 'transacoes',
  onNavigate,
  onLogout,
}: MobileTransacoesProps) {
  const insets = useSafeAreaInsets();
  const summary = useCashflowSummary();
  const transactions = useTransactions();
  const recurrences = useRecurrences();
  const debts = useFutureDebts();

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

        <View className="px-container-margin">
          <TransactionFilterTabs tabs={['Recentes', 'Recorrências', 'Dívidas']} />
        </View>

        <QuerySection query={transactions} label="as transações">
          {(data) => (
            <View className="gap-stack-md px-container-margin">
              <SectionHeading>Transações</SectionHeading>
              {data.map((transaction) => (
                <TransactionRow key={transaction.id} transaction={transaction} hidden={hidden} />
              ))}
            </View>
          )}
        </QuerySection>

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
