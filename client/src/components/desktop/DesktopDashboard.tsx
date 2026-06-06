import { ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CategoriasPanel } from './CategoriasPanel';
import { ContasPanel } from './ContasPanel';
import { DesktopHeader } from './DesktopHeader';
import { EsteMesPanel } from './EsteMesPanel';
import { InvestimentosPanel } from './InvestimentosPanel';
import { SaldoHero } from './SaldoHero';
import { SideNav } from './SideNav';
import { TickerPanel } from './TickerPanel';
import type { DashboardSnapshot } from '../../types/dashboard';

type DesktopDashboardProps = {
  data: DashboardSnapshot;
  hidden: boolean;
  onToggleHidden: () => void;
};

// Layout enterprise: rail fixo + grid de células com bordas finas. Brilho sutil
// (verde→roxo) no fundo, como no protótipo desktop.
export function DesktopDashboard({ data, hidden, onToggleHidden }: DesktopDashboardProps) {
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
      <SideNav />
      <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
        <DesktopHeader hidden={hidden} onToggleHidden={onToggleHidden} />
        <View className="flex-1 border-t border-grid-line">
          <SaldoHero balance={data.balance} hidden={hidden} />

          <View className="flex-row border-b border-grid-line">
            <View className="flex-1 border-r border-grid-line">
              <ContasPanel accounts={data.accounts} hidden={hidden} />
            </View>
            <View className="flex-1 border-r border-grid-line">
              <InvestimentosPanel
                investments={data.investments}
                summary={data.investmentsSummary}
                hidden={hidden}
              />
            </View>
            <View className="flex-1">
              <EsteMesPanel esteMes={data.esteMes} diagnosis={data.diagnosis} />
            </View>
          </View>

          <View className="flex-1 flex-row">
            <View className="border-r border-grid-line" style={{ flex: 2 }}>
              <CategoriasPanel categories={data.categories} hidden={hidden} />
            </View>
            <View className="flex-1">
              <TickerPanel ticker={data.ticker} hidden={hidden} />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
