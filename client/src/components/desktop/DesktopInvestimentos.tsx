import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SideNav } from './SideNav';
import { InvestimentosHeader } from './InvestimentosHeader';
import { AllocationBar } from '../investimentos/AllocationBar';
import { CryptoSection } from '../investimentos/CryptoSection';
import { EvolutionSection } from '../investimentos/EvolutionSection';
import { PortfolioHero } from '../investimentos/PortfolioHero';
import { PositionRow } from '../investimentos/PositionRow';
import { RiskAssessmentCard } from '../investimentos/RiskAssessmentCard';
import { QuerySection } from '../QuerySection';
import { SectionHeading } from '../SectionHeading';
import {
  useCryptoBlock,
  useInvestmentAllocation,
  useInvestmentPositions,
  useInvestmentRisk,
  useInvestmentSummary,
  usePortfolioEvolution,
} from '../../hooks/useInvestimentosQueries';
import type { AppRoute } from '../../navigation/routes';

type DesktopInvestimentosProps = {
  hidden: boolean;
  onToggleHidden: () => void;
  route?: AppRoute;
  onNavigate?: (route: AppRoute) => void;
  onLogout?: () => void;
  onCreateAsset?: () => void;
  onOpenAsset?: (id: string) => void;
};

// Larguras das colunas da tabela "Registro de Quedas" — compartilhadas entre o cabeçalho
// daqui e o PositionRow variant="row" (mesmo w-32) pra alinhar.
const columnHeadClass =
  'w-32 text-right font-geist-medium text-label-sm uppercase text-on-surface-variant';

// Layout enterprise da tela de Investimentos: rail fixo + header (título + ocultar valores,
// SEM "novo aporte" — somente leitura) + grid 2/3 (portfólio geral: resumo + alocação +
// tabela de posições) / 1/3 (cripto À PARTE + avaliação de risco), dividido por border-grid-line.
// Cada célula é uma query independente. Brilho verde→roxo no fundo (mesmo padrão do dashboard/contas).
export function DesktopInvestimentos({
  hidden,
  onToggleHidden,
  route = 'investimentos',
  onNavigate,
  onLogout,
  onCreateAsset,
  onOpenAsset,
}: DesktopInvestimentosProps) {
  const summary = useInvestmentSummary();
  const allocation = useInvestmentAllocation();
  const evolution = usePortfolioEvolution('1mo');
  const positions = useInvestmentPositions();
  const crypto = useCryptoBlock();
  const risk = useInvestmentRisk();

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
        <InvestimentosHeader
          hidden={hidden}
          onToggleHidden={onToggleHidden}
          onCreateAsset={onCreateAsset}
        />

        <View className="flex-1 flex-row border-t border-grid-line">
          <View className="border-r border-grid-line" style={{ flex: 2 }}>
            <QuerySection query={summary} label="o resumo do portfólio">
              {(data) => <PortfolioHero summary={data} hidden={hidden} />}
            </QuerySection>

            <View className="border-t border-grid-line py-stack-lg">
              <QuerySection query={allocation} label="a alocação">
                {(data) => <AllocationBar allocation={data} hidden={hidden} />}
              </QuerySection>
            </View>

            <View className="border-t border-grid-line">
              <QuerySection query={evolution} label="a evolução do patrimônio">
                {(data) => <EvolutionSection points={data} hidden={hidden} />}
              </QuerySection>
            </View>

            <View className="gap-stack-md border-t border-grid-line px-container-margin py-stack-lg">
              <SectionHeading>Registro de Quedas</SectionHeading>
              <View className="flex-row items-center border-b border-grid-line pb-stack-sm">
                <Text className="flex-1 font-geist-medium text-label-sm uppercase text-on-surface-variant">
                  Ativo
                </Text>
                <Text className={columnHeadClass}>Investido</Text>
                <Text className={columnHeadClass}>Valor Atual</Text>
                <Text className={columnHeadClass}>Ganho/Perda</Text>
              </View>
              <QuerySection query={positions} label="as posições">
                {(data) => (
                  <View>
                    {data.map((position) => (
                      <PositionRow
                        key={position.id}
                        position={position}
                        hidden={hidden}
                        variant="row"
                        onPress={onOpenAsset ? () => onOpenAsset(position.id) : undefined}
                      />
                    ))}
                  </View>
                )}
              </QuerySection>
            </View>
          </View>

          <View className="flex-1 gap-stack-lg p-stack-lg">
            <QuerySection query={crypto} label="a cripto">
              {(data) => (
                <CryptoSection crypto={data} hidden={hidden} onOpenHolding={onOpenAsset} />
              )}
            </QuerySection>
            <QuerySection query={risk} label="a avaliação de risco">
              {(data) => <RiskAssessmentCard risk={data} />}
            </QuerySection>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
