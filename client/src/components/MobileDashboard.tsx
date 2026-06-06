import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AccountsSection } from './AccountsSection';
import { BalanceHero } from './BalanceHero';
import { BottomNav } from './BottomNav';
import { CategorySpendSection } from './CategorySpendSection';
import { DiagnosisCard } from './DiagnosisCard';
import { InvestmentsSection } from './InvestmentsSection';
import { TopBar } from './TopBar';
import type { DashboardSnapshot } from '../types/dashboard';

type MobileDashboardProps = {
  data: DashboardSnapshot;
  hidden: boolean;
  onToggleHidden: () => void;
};

// Pilha vertical do mobile. BottomNav fixa respeitando o safe-area; o conteúdo
// reserva espaço (pb) pra não ficar atrás dela.
export function MobileDashboard({ data, hidden, onToggleHidden }: MobileDashboardProps) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <TopBar hidden={hidden} onToggleHidden={onToggleHidden} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ gap: 24, paddingBottom: insets.bottom + 96 }}
      >
        <BalanceHero balance={data.balance} hidden={hidden} />
        <AccountsSection accounts={data.accounts} hidden={hidden} />
        <InvestmentsSection investments={data.investments} hidden={hidden} />
        <CategorySpendSection categories={data.categories} hidden={hidden} />
        <View className="px-container-margin">
          <DiagnosisCard diagnosis={data.diagnosis} />
        </View>
      </ScrollView>
      <View className="absolute bottom-0 left-0 right-0" style={{ paddingBottom: insets.bottom }}>
        <BottomNav />
      </View>
    </View>
  );
}
