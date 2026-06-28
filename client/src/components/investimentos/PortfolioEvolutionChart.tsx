import { useState } from 'react';
import { Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { MoneyText } from '../MoneyText';
import { toneColor } from '../../theme/colors';
import { areaPath, chartPointsIn, linePath, nearestIndex } from '../../lib/cryptoChart';
import type { EvolutionPoint } from '../../types/investimentos';

type PortfolioEvolutionChartProps = {
  points: EvolutionPoint[];
  hidden: boolean;
};

// Lemos só o que precisamos do evento de ponteiro (web manda offsetX; nativo, locationX).
type PointerLike = { nativeEvent: { offsetX?: number; locationX?: number } };

const HEIGHT = 120;
const TOOLTIP_W = 136;

// Gráfico de DUAS linhas — valor de MERCADO (área preenchida, verde no lucro / vermelho no prejuízo)
// × CUSTO acumulado (linha tracejada de referência) — no MESMO eixo Y (domínio compartilhado), pra o
// gap entre elas mostrar o ganho/perda. Crosshair + tooltip com os dois valores no cursor (hover no
// PC, arrastar no toque). Geometria pura (lib/cryptoChart); aqui medimos a largura e desenhamos.
export function PortfolioEvolutionChart({ points, hidden }: PortfolioEvolutionChartProps) {
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  const market = points.map((p) => p.marketValueCents);
  const cost = points.map((p) => p.costBasisCents);
  const min = Math.min(...market, ...cost);
  const max = Math.max(...market, ...cost);

  const last = points[points.length - 1];
  const gainTone = last && last.marketValueCents < last.costBasisCents ? 'error' : 'secondary';
  const marketColor = toneColor(gainTone);
  const costColor = toneColor('neutral');

  const marketPts = chartPointsIn(market, width, HEIGHT, min, max);
  const costPts = chartPointsIn(cost, width, HEIGHT, min, max);
  const activeMarket = active !== null ? marketPts[active] : undefined;
  const activeCost = active !== null ? costPts[active] : undefined;

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);
  const onMove = (event: PointerLike) => {
    const { offsetX, locationX } = event.nativeEvent;
    setActive(nearestIndex(offsetX ?? locationX ?? 0, width, points.length));
  };

  return (
    <View
      testID="evolution-chart"
      className="w-full"
      style={{ height: HEIGHT }}
      onLayout={onLayout}
      onPointerMove={onMove}
      onPointerLeave={() => setActive(null)}
    >
      {width > 0 && marketPts.length > 0 ? (
        <>
          <Svg width={width} height={HEIGHT} pointerEvents="none">
            <Defs>
              <LinearGradient id="evolArea" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={marketColor} stopOpacity={0.22} />
                <Stop offset="1" stopColor={marketColor} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Path d={areaPath(marketPts, HEIGHT)} fill="url(#evolArea)" />
            <Path
              d={linePath(costPts)}
              stroke={costColor}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              fill="none"
              opacity={0.7}
            />
            <Path d={linePath(marketPts)} stroke={marketColor} strokeWidth={2} fill="none" />
            {activeMarket ? (
              <>
                <Line
                  x1={activeMarket.x}
                  y1={0}
                  x2={activeMarket.x}
                  y2={HEIGHT}
                  stroke={marketColor}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  opacity={0.5}
                />
                <Circle cx={activeMarket.x} cy={activeMarket.y} r={4} fill={marketColor} />
                {activeCost ? (
                  <Circle cx={activeCost.x} cy={activeCost.y} r={3} fill={costColor} />
                ) : null}
              </>
            ) : null}
          </Svg>
          {activeMarket && active !== null ? (
            <View
              pointerEvents="none"
              className="absolute top-0 gap-stack-sm rounded-lg border border-outline-variant bg-surface-container-highest px-stack-sm py-stack-sm"
              style={{
                left: Math.max(0, Math.min(activeMarket.x - TOOLTIP_W / 2, width - TOOLTIP_W)),
                width: TOOLTIP_W,
              }}
            >
              <View className="flex-row items-center justify-between gap-stack-sm">
                <Text className="font-geist-medium text-label-sm uppercase text-on-surface-variant">
                  Mercado
                </Text>
                <MoneyText
                  cents={market[active]!}
                  hidden={hidden}
                  tone="neutral"
                  className="font-geist-semibold text-label-sm"
                />
              </View>
              <View className="flex-row items-center justify-between gap-stack-sm">
                <Text className="font-geist-medium text-label-sm uppercase text-on-surface-variant">
                  Custo
                </Text>
                <MoneyText
                  cents={cost[active]!}
                  hidden={hidden}
                  tone="neutral"
                  className="font-geist-medium text-label-sm"
                />
              </View>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}
