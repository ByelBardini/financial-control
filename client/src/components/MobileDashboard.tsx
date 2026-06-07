import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AccountsSection } from './AccountsSection';
import { BalanceHero } from './BalanceHero';
import { BottomNav } from './BottomNav';
import { CategorySpendSection } from './CategorySpendSection';
import { DiagnosisCard } from './DiagnosisCard';
import { InvestmentsSection } from './InvestmentsSection';
import { QuerySection } from './QuerySection';
import { TopBar } from './TopBar';
import {
  useAccounts,
  useCategories,
  useDiagnosis,
  useInvestments,
  useMonthBalance,
} from '../hooks/useDashboardQueries';

type MobileDashboardProps = {
  hidden: boolean;
  onToggleHidden: () => void;
  onLogout?: () => void;
};

// Pilha vertical do mobile. Cada seção é uma query independente (loading/erro por
// seção via QuerySection). BottomNav fixa respeitando o safe-area; o conteúdo
// reserva espaço (pb) pra não ficar atrás dela.
export function MobileDashboard({ hidden, onToggleHidden, onLogout }: MobileDashboardProps) {
  const insets = useSafeAreaInsets();
  const balance = useMonthBalance();
  const accounts = useAccounts();
  const investments = useInvestments();
  const categories = useCategories();
  const diagnosis = useDiagnosis();

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <TopBar hidden={hidden} onToggleHidden={onToggleHidden} onLogout={onLogout} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ gap: 24, paddingBottom: insets.bottom + 96 }}
      >
        <QuerySection query={balance} label="o saldo">
          {(data) => <BalanceHero balance={data} hidden={hidden} />}
        </QuerySection>
        <QuerySection query={accounts} label="as contas">
          {(data) => <AccountsSection accounts={data} hidden={hidden} />}
        </QuerySection>
        <QuerySection query={investments} label="os investimentos">
          {(data) => <InvestmentsSection investments={data} hidden={hidden} />}
        </QuerySection>
        <QuerySection query={categories} label="as categorias">
          {(data) => <CategorySpendSection categories={data} hidden={hidden} />}
        </QuerySection>
        <QuerySection query={diagnosis} label="o diagnóstico">
          {(data) => (
            <View className="px-container-margin">
              <DiagnosisCard diagnosis={data} />
            </View>
          )}
        </QuerySection>
      </ScrollView>
      <View className="absolute bottom-0 left-0 right-0" style={{ paddingBottom: insets.bottom }}>
        <BottomNav />
      </View>
    </View>
  );
}
