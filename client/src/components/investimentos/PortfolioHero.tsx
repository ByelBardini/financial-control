import { Text, View } from 'react-native';
import { MoneyText } from '../MoneyText';
import { toneColor } from '../../theme/colors';
import { formatPercent, changeTone } from '../../lib/percent';
import type { PortfolioSummary } from '../../types/investimentos';

type PortfolioHeroProps = {
  summary: PortfolioSummary;
  hidden: boolean;
};

// Herói do portfólio GERAL (Ações/FIIs/Renda Fixa — cripto fica à parte): patrimônio
// em ativos em destaque + ganho/perda acumulado (R$ e %) vs. o total investido + frase
// ácida. Espelha o BalanceHero da Início.
export function PortfolioHero({ summary, hidden }: PortfolioHeroProps) {
  const tone = changeTone(summary.gainPct);
  return (
    <View className="gap-stack-md border-b border-outline-variant px-container-margin pb-stack-lg">
      <Text className="font-geist-medium text-label-md uppercase text-on-surface-variant">
        Patrimônio em Ativos
      </Text>
      <Text
        accessibilityRole="header"
        className="font-hanken-bold text-headline-md text-on-surface"
      >
        {summary.title}
      </Text>
      <MoneyText
        cents={summary.totalCents}
        hidden={hidden}
        tone="neutral"
        className="font-hanken-bold text-display-lg-mobile"
      />
      <View className="flex-row items-center gap-stack-sm">
        <MoneyText
          cents={summary.gainCents}
          hidden={hidden}
          tone={tone}
          className="font-geist-medium text-label-md"
        />
        <Text className="font-geist-medium text-label-md" style={{ color: toneColor(tone) }}>
          ({formatPercent(summary.gainPct)})
        </Text>
      </View>
      <Text className="font-geist-medium text-label-sm text-on-surface-variant">
        {summary.quip}
      </Text>
    </View>
  );
}
