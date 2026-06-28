import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AllocationBar } from './investimentos/AllocationBar';
import { CryptoSection } from './investimentos/CryptoSection';
import { EvolutionSection } from './investimentos/EvolutionSection';
import { PortfolioHero } from './investimentos/PortfolioHero';
import { PositionRow } from './investimentos/PositionRow';
import { RiskAssessmentCard } from './investimentos/RiskAssessmentCard';
import { BottomNav } from './BottomNav';
import { Fab } from './Fab';
import { MobilePageHeader } from './MobilePageHeader';
import { QuerySection } from './QuerySection';
import { SectionHeading } from './SectionHeading';
import { TopBar } from './TopBar';
import {
  useCryptoBlock,
  useInvestmentAllocation,
  useInvestmentPositions,
  useInvestmentRisk,
  useInvestmentSummary,
  usePortfolioEvolution,
} from '../hooks/useInvestimentosQueries';
import type { AppRoute } from '../navigation/routes';

type MobileInvestimentosProps = {
  hidden: boolean;
  onToggleHidden: () => void;
  route?: AppRoute;
  onNavigate?: (route: AppRoute) => void;
  onLogout?: () => void;
  onCreateAsset?: () => void;
  onOpenAsset?: (id: string) => void;
};

// Pilha vertical do mobile (Investimentos). Cada seção é uma query independente
// (loading/erro por seção via QuerySection). FAB "+" cadastra um ativo; tocar numa posição ou
// cripto abre o detalhe (comprar/vender/editar). A cripto fica num bloco à parte (CryptoSection),
// depois do portfólio geral. BottomNav + FAB fixos respeitando o safe-area; o conteúdo reserva pb.
export function MobileInvestimentos({
  hidden,
  onToggleHidden,
  route = 'investimentos',
  onNavigate,
  onLogout,
  onCreateAsset,
  onOpenAsset,
}: MobileInvestimentosProps) {
  const insets = useSafeAreaInsets();
  const summary = useInvestmentSummary();
  const allocation = useInvestmentAllocation();
  const evolution = usePortfolioEvolution('1mo');
  const positions = useInvestmentPositions();
  const crypto = useCryptoBlock();
  const risk = useInvestmentRisk();

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <TopBar hidden={hidden} onToggleHidden={onToggleHidden} onLogout={onLogout} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ gap: 24, paddingBottom: insets.bottom + 96 }}
      >
        <MobilePageHeader eyebrow="Risco Máximo" title="Investimentos" />
        <QuerySection query={summary} label="o resumo do portfólio">
          {(data) => <PortfolioHero summary={data} hidden={hidden} />}
        </QuerySection>

        <QuerySection query={allocation} label="a alocação">
          {(data) => <AllocationBar allocation={data} hidden={hidden} />}
        </QuerySection>

        <QuerySection query={evolution} label="a evolução do patrimônio">
          {(data) => <EvolutionSection points={data} hidden={hidden} />}
        </QuerySection>

        <QuerySection query={positions} label="as posições">
          {(data) => (
            <View className="gap-stack-md px-container-margin">
              <SectionHeading>Registro de Quedas</SectionHeading>
              {data.map((position) => (
                <PositionRow
                  key={position.id}
                  position={position}
                  hidden={hidden}
                  onPress={onOpenAsset ? () => onOpenAsset(position.id) : undefined}
                />
              ))}
            </View>
          )}
        </QuerySection>

        <QuerySection query={crypto} label="a cripto">
          {(data) => (
            <View className="px-container-margin">
              <CryptoSection crypto={data} hidden={hidden} onOpenHolding={onOpenAsset} />
            </View>
          )}
        </QuerySection>

        <QuerySection query={risk} label="a avaliação de risco">
          {(data) => (
            <View className="px-container-margin">
              <RiskAssessmentCard risk={data} />
            </View>
          )}
        </QuerySection>
      </ScrollView>

      <Fab
        iconName="add"
        accessibilityLabel="Novo ativo"
        onPress={() => onCreateAsset?.()}
        bottom={insets.bottom + 88}
      />

      <View className="absolute bottom-0 left-0 right-0" style={{ paddingBottom: insets.bottom }}>
        <BottomNav currentRoute={route} onNavigate={onNavigate} />
      </View>
    </View>
  );
}
