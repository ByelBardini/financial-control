import { Text, View } from 'react-native';
import { MoneyText } from '../MoneyText';
import { formatPercent } from '../../lib/percent';
import type { Ticker } from '../../types/dashboard';

const BAR_HEIGHTS = [20, 25, 15, 30, 45, 35, 50, 65, 55, 80, 100];

type TickerPanelProps = {
  ticker: Ticker;
  hidden: boolean;
};

// Coluna estreita (4/12): cotação do ticker + posição + gráfico decorativo.
export function TickerPanel({ ticker, hidden }: TickerPanelProps) {
  return (
    <View className="justify-between gap-stack-lg p-stack-lg">
      <View className="gap-stack-md">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-stack-sm">
            <View className="h-6 w-6 items-center justify-center rounded-full bg-primary-container">
              <Text className="font-hanken-bold text-[10px] text-on-primary-container">
                {ticker.symbol}
              </Text>
            </View>
            <Text className="font-hanken text-body-md text-on-surface">{ticker.name}</Text>
          </View>
          <View className="rounded bg-secondary/10 px-stack-sm py-[2px]">
            <Text className="font-geist-medium text-label-sm text-secondary">
              {`${formatPercent(ticker.changePct24h)} 24h`}
            </Text>
          </View>
        </View>
        <View className="gap-stack-sm">
          <MoneyText
            cents={ticker.priceCents}
            hidden={hidden}
            tone="neutral"
            className="font-hanken-semibold text-headline-md"
          />
          <View className="flex-row items-center gap-stack-sm">
            <Text className="font-geist-medium text-label-sm text-on-surface-variant">
              Sua posição:
            </Text>
            <MoneyText
              cents={ticker.positionCents}
              hidden={hidden}
              tone="neutral"
              className="font-geist-medium text-label-sm"
            />
          </View>
        </View>
      </View>

      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="h-16 flex-row items-end gap-[2px]"
      >
        {BAR_HEIGHTS.map((height, index) => (
          <View key={index} className="flex-1 bg-primary/60" style={{ height: `${height}%` }} />
        ))}
      </View>
    </View>
  );
}
