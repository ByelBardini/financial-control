import { ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CategoriasPanel } from './CategoriasPanel';
import { ContasPanel } from './ContasPanel';
import { DesktopHeader } from './DesktopHeader';
import { EsteMesPanel } from './EsteMesPanel';
import { InvestimentosPanel } from './InvestimentosPanel';
import { SaldoHero } from './SaldoHero';
import { SideNav } from './SideNav';
import { QuerySection, QuerySection2 } from '../QuerySection';
import {
  useAccounts,
  useCategories,
  useDiagnosis,
  useEsteMes,
  useInvestments,
  useInvestmentsSummary,
  useMonthBalance,
} from '../../hooks/useDashboardQueries';
import { usePatrimonioOverview } from '../../hooks/usePatrimonioQueries';
import type { MenuAnchor } from '../transacoes/NewTransactionMenu';
import type { AppRoute } from '../../navigation/routes';

type DesktopDashboardProps = {
  hidden: boolean;
  onToggleHidden: () => void;
  route?: AppRoute;
  onNavigate?: (route: AppRoute) => void;
  onLogout?: () => void;
  onCreate?: (anchor?: MenuAnchor) => void;
};

// Layout enterprise: rail fixo + grid de células com bordas finas. Cada célula é
// uma query independente (loading/erro por seção). Brilho sutil (verde→roxo) no
// fundo, como no protótipo desktop.
export function DesktopDashboard({
  hidden,
  onToggleHidden,
  route = 'dashboard',
  onNavigate,
  onLogout,
  onCreate,
}: DesktopDashboardProps) {
  const balance = useMonthBalance();
  const overview = usePatrimonioOverview();
  const accounts = useAccounts();
  const investments = useInvestments();
  const investmentsSummary = useInvestmentsSummary();
  const esteMes = useEsteMes();
  const diagnosis = useDiagnosis();
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
      <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
        <DesktopHeader hidden={hidden} onToggleHidden={onToggleHidden} onCreate={onCreate} />
        <View className="flex-1 border-t border-grid-line">
          <QuerySection2 queryA={balance} queryB={overview} label="o saldo">
            {(b, o) => <SaldoHero balance={b} overview={o} hidden={hidden} />}
          </QuerySection2>

          <View className="flex-row border-b border-grid-line">
            <View className="flex-1 border-r border-grid-line">
              <QuerySection query={accounts} label="as contas">
                {(data) => <ContasPanel accounts={data} hidden={hidden} />}
              </QuerySection>
            </View>
            <View className="flex-1 border-r border-grid-line">
              <QuerySection2
                queryA={investments}
                queryB={investmentsSummary}
                label="os investimentos"
              >
                {(inv, summary) => (
                  <InvestimentosPanel investments={inv} summary={summary} hidden={hidden} />
                )}
              </QuerySection2>
            </View>
            <View className="flex-1">
              <QuerySection2 queryA={esteMes} queryB={diagnosis} label="o panorama do mês">
                {(em, diag) => <EsteMesPanel esteMes={em} diagnosis={diag} />}
              </QuerySection2>
            </View>
          </View>

          <View className="flex-1">
            <QuerySection query={categories} label="as categorias">
              {(data) => <CategoriasPanel categories={data} hidden={hidden} />}
            </QuerySection>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
