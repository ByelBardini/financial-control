import { Text, View } from 'react-native';
import { PortfolioEvolutionChart } from './PortfolioEvolutionChart';
import { MoneyText } from '../MoneyText';
import { SectionHeading } from '../SectionHeading';
import { toneColor } from '../../theme/colors';
import type { EvolutionPoint } from '../../types/investimentos';

type EvolutionSectionProps = {
  points: EvolutionPoint[];
  hidden: boolean;
};

// Legenda: bolinha colorida + rótulo da linha (mercado/custo).
function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-stack-sm">
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text className="font-geist-medium text-label-sm uppercase text-on-surface-variant">
        {label}
      </Text>
    </View>
  );
}

// Evolução do patrimônio GERAL ao longo do tempo: valor de MERCADO × CUSTO acumulado (o gap entre as
// duas linhas = ganho não-realizado) — o gráfico de "valorizou ou não?", padrão de mercado. Cripto
// fica fora (tem o próprio gráfico no card). Presentacional: reusado pelos dois layouts.
export function EvolutionSection({ points, hidden }: EvolutionSectionProps) {
  const last = points[points.length - 1];
  const gainTone = last && last.marketValueCents < last.costBasisCents ? 'error' : 'secondary';

  return (
    <View className="gap-stack-md px-container-margin py-stack-lg">
      <View className="flex-row items-end justify-between gap-stack-md">
        <SectionHeading>Evolução do Patrimônio</SectionHeading>
        <View className="flex-row items-center gap-stack-md">
          <LegendDot color={toneColor(gainTone)} label="Valor atual" />
          <LegendDot color={toneColor('neutral')} label="Investido" />
        </View>
      </View>
      <Text className="font-geist-medium text-label-sm text-on-surface-variant">
        Quanto a carteira vale (valor atual) × quanto você pôs (investido) — a diferença é seu
        ganho/perda.
      </Text>
      {points.length > 0 ? (
        <PortfolioEvolutionChart points={points} hidden={hidden} />
      ) : (
        <Text className="font-geist-medium text-label-sm text-on-surface-variant">
          Sem histórico ainda — aparece conforme as cotações chegam.
        </Text>
      )}
    </View>
  );
}
