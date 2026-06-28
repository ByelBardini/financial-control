import { Text, View } from 'react-native';
import { PriceSparkline } from './PriceSparkline';
import { EditableCard } from '../EditableCard';
import { Icon } from '../Icon';
import { MoneyText } from '../MoneyText';
import { toneColor } from '../../theme/colors';
import { changeTone, formatPercent } from '../../lib/percent';
import type { CryptoHolding } from '../../types/investimentos';

type CryptoCardProps = {
  holding: CryptoHolding;
  hidden: boolean;
  onPress?: () => void;
};

// Card de uma cripto do bloco à parte ("O Circo da Volatilidade"): símbolo/nome + valor
// atual em destaque + resultado (ganho/perda em R$ e %). Sem cotação ao vivo — o resultado
// é o valor atual informado menos o investido. Com onPress vira alvo de toque (abre o detalhe).
export function CryptoCard({ holding, hidden, onPress }: CryptoCardProps) {
  const tone = changeTone(holding.gainPct);
  return (
    <EditableCard
      className="gap-stack-md rounded-xl border border-outline-variant bg-surface-container p-gutter"
      editLabel={`Abrir ${holding.symbol}`}
      onPress={onPress}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-stack-md">
          <Icon name={holding.icon} size={24} color={toneColor(tone)} />
          <View>
            <Text className="font-geist-semibold text-label-md text-on-surface">
              {holding.symbol}
            </Text>
            <Text className="font-geist-medium text-label-sm text-on-surface-variant">
              {holding.name}
            </Text>
          </View>
        </View>
        <Text className="font-geist-medium text-label-md" style={{ color: toneColor(tone) }}>
          {formatPercent(holding.gainPct)}
        </Text>
      </View>
      <MoneyText
        cents={holding.currentValueCents}
        hidden={hidden}
        tone="neutral"
        className="font-hanken-bold text-headline-md"
      />
      <View className="flex-row items-center gap-stack-sm">
        <Text className="font-geist-medium text-label-sm text-on-surface-variant">Resultado</Text>
        <MoneyText
          cents={holding.gainCents}
          hidden={hidden}
          tone={tone}
          className="font-geist-medium text-label-sm"
        />
      </View>
      <PriceSparkline series={holding.series} tone={tone} hidden={hidden} />
    </EditableCard>
  );
}
