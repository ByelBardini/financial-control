import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { PriceSparkline } from './PriceSparkline';
import { SectionError } from '../SectionError';
import { SectionSkeleton } from '../SectionSkeleton';
import { usePriceHistory } from '../../hooks/useInvestimentosQueries';
import type { Tone } from '../../types/dashboard';

type AssetHistorySectionProps = {
  assetId: string;
  tone: Tone;
  hidden?: boolean;
};

const RANGES = [
  { label: '1M', value: '1mo' },
  { label: '6M', value: '6mo' },
  { label: '1A', value: '1y' },
] as const;

// Histórico de preço de um ativo (qualquer classe) no detalhe: série diária do backend
// (`usePriceHistory`) + toggle de período (1M/6M/1A, default 6M). Mesmo gráfico da cripto
// (`PriceSparkline`). Gating manual igual ao resto do AssetDetailModal (skeleton/erro/vazio).
export function AssetHistorySection({ assetId, tone, hidden = false }: AssetHistorySectionProps) {
  const [range, setRange] = useState<string>('1mo');
  const history = usePriceHistory(assetId, range);

  return (
    <View className="gap-stack-sm">
      <View className="flex-row items-center justify-between gap-stack-md">
        <Text className="font-geist-semibold text-label-sm uppercase text-on-surface-variant">
          Histórico de preço
        </Text>
        <View className="flex-row gap-stack-sm">
          {RANGES.map((r) => {
            const selected = r.value === range;
            return (
              <Pressable
                key={r.value}
                onPress={() => setRange(r.value)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                className={`rounded-md px-stack-sm py-stack-sm ${selected ? 'bg-surface-container-highest' : ''}`}
              >
                <Text
                  className={`font-geist-medium text-label-sm ${selected ? 'text-primary' : 'text-on-surface-variant'}`}
                >
                  {r.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      {renderBody()}
    </View>
  );

  function renderBody() {
    if (history.isPending) return <SectionSkeleton />;
    if (history.isError)
      return <SectionError label="o histórico" onRetry={() => void history.refetch()} />;
    if (history.data.length === 0)
      return (
        <Text className="font-geist-medium text-label-sm text-on-surface-variant">
          Sem histórico ainda — aparece conforme as cotações chegam.
        </Text>
      );
    return (
      <PriceSparkline
        series={history.data.map((p) => p.priceCents)}
        labels={history.data.map((p) => p.date)}
        tone={tone}
        hidden={hidden}
      />
    );
  }
}
