import { useState } from 'react';
import { Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { MoneyText } from '../MoneyText';
import { toneColor } from '../../theme/colors';
import { formatChartDay, formatChartMonth } from '../../lib/chartDate';
import { areaPath, chartPoints, linePath, nearestIndex } from '../../lib/cryptoChart';
import type { Tone } from '../../types/dashboard';

type PriceSparklineProps = {
  series: number[];
  tone: Tone;
  hidden: boolean;
  // Datas ISO (YYYY-MM-DD) paralelas a `series`. Quando presentes, o tooltip mostra a data do ponto
  // e o eixo ganha rótulos de início/fim. Opcional pra não quebrar quem só tem a série.
  labels?: string[];
};

// Lemos só o que precisamos do evento de ponteiro (web manda offsetX; nativo, locationX).
type PointerLike = { nativeEvent: { offsetX?: number; locationX?: number } };

const HEIGHT = 72;
const TOOLTIP_W = 112;

// Gráfico de linha/área de PREÇO (série única, centavos) com crosshair + tooltip que segue o cursor
// (hover no PC, arrastar no toque). Genérico: usado pela cripto (`CryptoCard`) e pelo histórico de
// preço de qualquer ativo (`AssetHistorySection`). Com `labels`, mostra a data no tooltip e o período
// (início … fim) embaixo. A geometria é pura (lib/cryptoChart); aqui medimos a largura e desenhamos.
export function PriceSparkline({ series, tone, hidden, labels }: PriceSparklineProps) {
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const color = toneColor(tone);

  const points = chartPoints(series, width, HEIGHT);
  const activePoint = active !== null ? points[active] : undefined;
  const hasLabels = !!labels && labels.length === series.length && labels.length > 0;

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);
  const onMove = (event: PointerLike) => {
    const { offsetX, locationX } = event.nativeEvent;
    setActive(nearestIndex(offsetX ?? locationX ?? 0, width, series.length));
  };

  return (
    <View className="w-full gap-stack-sm">
      <View
        testID="price-sparkline"
        className="w-full"
        style={{ height: HEIGHT }}
        onLayout={onLayout}
        onPointerMove={onMove}
        onPointerLeave={() => setActive(null)}
      >
        {width > 0 && points.length > 0 ? (
          <>
            <Svg width={width} height={HEIGHT} pointerEvents="none">
              <Defs>
                <LinearGradient id="priceArea" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={color} stopOpacity={0.25} />
                  <Stop offset="1" stopColor={color} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Path d={areaPath(points, HEIGHT)} fill="url(#priceArea)" />
              <Path d={linePath(points)} stroke={color} strokeWidth={2} fill="none" />
              {activePoint ? (
                <>
                  <Line
                    x1={activePoint.x}
                    y1={0}
                    x2={activePoint.x}
                    y2={HEIGHT}
                    stroke={color}
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    opacity={0.5}
                  />
                  <Circle cx={activePoint.x} cy={activePoint.y} r={4} fill={color} />
                </>
              ) : null}
            </Svg>
            {activePoint && active !== null ? (
              <View
                pointerEvents="none"
                className="absolute top-0 items-center gap-stack-sm rounded-lg border border-outline-variant bg-surface-container-highest px-stack-sm py-stack-sm"
                style={{
                  left: Math.max(0, Math.min(activePoint.x - TOOLTIP_W / 2, width - TOOLTIP_W)),
                  width: TOOLTIP_W,
                }}
              >
                {hasLabels ? (
                  <Text className="font-geist-medium text-label-sm text-on-surface-variant">
                    {formatChartDay(labels![active]!)}
                  </Text>
                ) : null}
                <MoneyText
                  cents={series[active]!}
                  hidden={hidden}
                  tone="neutral"
                  className="font-geist-semibold text-label-sm"
                />
              </View>
            ) : null}
          </>
        ) : null}
      </View>
      {hasLabels && width > 0 ? (
        <View className="flex-row justify-between">
          <Text className="font-geist-medium text-label-sm text-on-surface-variant">
            {formatChartMonth(labels![0]!)}
          </Text>
          <Text className="font-geist-medium text-label-sm text-on-surface-variant">
            {formatChartMonth(labels![labels!.length - 1]!)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
