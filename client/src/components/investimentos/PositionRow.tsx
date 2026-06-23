import { Text, View } from 'react-native';
import { EditableCard } from '../EditableCard';
import { Icon } from '../Icon';
import { MoneyText } from '../MoneyText';
import { toneColor } from '../../theme/colors';
import { changeTone, formatPercent } from '../../lib/percent';
import type { Position } from '../../types/investimentos';

type PositionRowProps = {
  position: Position;
  hidden: boolean;
  variant?: 'card' | 'row';
  onPress?: () => void;
};

// Linha de posição do portfólio geral. variant 'card' (mobile): identidade à esquerda,
// métricas empilhadas à direita. variant 'row' (desktop): colunas alinhadas ao cabeçalho
// da tabela "Registro de Quedas" (Ativo | Investido | Valor Atual | Ganho/Perda). Sem
// cotação ao vivo: o ganho/perda é o valor atual informado menos o total investido.
export function PositionRow({ position, hidden, variant = 'card', onPress }: PositionRowProps) {
  const tone = changeTone(position.gainPct);
  const editLabel = `Abrir ${position.ticker}`;

  const identity = (
    <View className="flex-1 flex-row items-center gap-stack-md">
      <Icon name={position.icon} size={20} color={toneColor(tone)} />
      <View className="flex-1">
        <Text className="font-geist-semibold text-label-md text-on-surface">{position.ticker}</Text>
        <Text className="font-geist-medium text-label-sm text-on-surface-variant">
          {position.name}
        </Text>
      </View>
    </View>
  );

  const gain = (
    <View className="flex-row items-center gap-stack-sm">
      <MoneyText
        cents={position.gainCents}
        hidden={hidden}
        tone={tone}
        className="font-geist-medium text-label-md"
      />
      <Text className="font-geist-medium text-label-sm" style={{ color: toneColor(tone) }}>
        {formatPercent(position.gainPct)}
      </Text>
    </View>
  );

  if (variant === 'row') {
    return (
      <EditableCard
        className="flex-row items-center border-b border-grid-line py-stack-md"
        editLabel={editLabel}
        onPress={onPress}
      >
        {identity}
        <View className="w-32 items-end">
          <MoneyText
            cents={position.costBasisCents}
            hidden={hidden}
            tone="neutral"
            className="font-geist-medium text-label-md"
          />
        </View>
        <View className="w-32 items-end">
          <MoneyText
            cents={position.currentValueCents}
            hidden={hidden}
            tone="neutral"
            className="font-hanken-semibold text-label-md"
          />
        </View>
        <View className="w-32 items-end gap-stack-sm">
          <MoneyText
            cents={position.gainCents}
            hidden={hidden}
            tone={tone}
            className="font-geist-semibold text-label-md"
          />
          <Text className="font-geist-medium text-label-sm" style={{ color: toneColor(tone) }}>
            {formatPercent(position.gainPct)}
          </Text>
        </View>
      </EditableCard>
    );
  }

  return (
    <EditableCard
      className="flex-row items-center justify-between py-stack-md"
      editLabel={editLabel}
      onPress={onPress}
    >
      {identity}
      <View className="items-end gap-stack-sm">
        <MoneyText
          cents={position.currentValueCents}
          hidden={hidden}
          tone="neutral"
          className="font-hanken-semibold text-headline-sm"
        />
        {gain}
        <View className="flex-row items-center gap-stack-sm">
          <Text className="font-geist-medium text-label-sm text-on-surface-variant">Investido</Text>
          <MoneyText
            cents={position.costBasisCents}
            hidden={hidden}
            tone="neutral"
            className="font-geist-medium text-label-sm"
          />
        </View>
      </View>
    </EditableCard>
  );
}
