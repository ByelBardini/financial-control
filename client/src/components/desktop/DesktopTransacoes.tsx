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
  useFutureDebts,
  useRecurrences,
  useTransactions,
} from '../../hooks/useTransacoesQueries';
import type { AppRoute } from '../../navigation/routes';

type DesktopTransacoesProps = {
  hidden: boolean;
  onToggleHidden: () => void;
  route?: AppRoute;
  onNavigate?: (route: AppRoute) => void;
  onLogout?: () => void;
};

// Layout enterprise da tela de Transações: rail fixo + header + faixa de fluxo de caixa
// + grid 2/3 (lista de transações) / 1/3 (Recorrências + Dívidas Futuras), dividido por
// border-grid-line. Cada célula é uma query independente. Brilho verde→roxo no fundo.
export function DesktopTransacoes({
  hidden,
  onToggleHidden,
  route = 'transacoes',
  onNavigate,
  onLogout,
}: DesktopTransacoesProps) {
  const summary = useCashflowSummary();
  const transactions = useTransactions();
  const recurrences = useRecurrences();
  const debts = useFutureDebts();

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
      <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
        <TransacoesHeader hidden={hidden} onToggleHidden={onToggleHidden} />

        <QuerySection query={summary} label="o fluxo de caixa">
          {(data) => <FluxoCaixaBar summary={data} hidden={hidden} />}
        </QuerySection>

        <View className="flex-1 flex-row border-t border-grid-line">
          <View className="border-r border-grid-line" style={{ flex: 2 }}>
            <QuerySection query={transactions} label="as transações">
              {(data) => <TransactionListPanel transactions={data} hidden={hidden} />}
            </QuerySection>
          </View>

          <View className="flex-1">
            <QuerySection query={recurrences} label="as recorrências">
              {(data) => <RecorrenciasPanel recurrences={data} hidden={hidden} />}
            </QuerySection>
            <View className="border-t border-grid-line">
              <QuerySection query={debts} label="as dívidas futuras">
                {(data) => <DividasPanel debts={data} hidden={hidden} />}
              </QuerySection>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
