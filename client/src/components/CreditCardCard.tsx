import { Text, View } from 'react-native';
import { Card } from './Card';
import { Icon } from './Icon';
import { MoneyText } from './MoneyText';
import { ProgressBar } from './ProgressBar';
import { formatBRL, MONEY_MASK } from '../lib/money';
import { toneColor } from '../theme/colors';
import type { CreditCard } from '../types/contas';

type CreditCardCardProps = {
  card: CreditCard;
  hidden: boolean;
  onPress?: () => void;
};

// Card de cartão de crédito: tile da marca + nome, fatura atual em destaque, barra
// de uso do limite (tom = severidade) e legenda "disponível de total" + nota ácida.
// Com onPress, vira um alvo "Editar conta" acessível.
export function CreditCardCard({ card, hidden, onPress }: CreditCardCardProps) {
  const limitLabel = hidden ? MONEY_MASK : formatBRL(card.limitCents);
  const availableLabel = hidden ? MONEY_MASK : formatBRL(card.availableCents);
  const body = (
    <>
      <View className="flex-row items-center gap-stack-md">
        <View
          className="h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: card.brandColor }}
        >
          <Icon name={card.icon} size={20} color="#ffffff" />
        </View>
        <Text className="flex-1 font-geist-semibold text-label-md text-on-surface">
          {card.name}
        </Text>
      </View>
      <View>
        <Text className="font-geist-medium text-label-sm text-on-surface-variant">
          Fatura atual
        </Text>
        <MoneyText
          cents={card.invoiceCents}
          hidden={hidden}
          tone="neutral"
          className="font-hanken-semibold text-headline-sm"
        />
      </View>
      <ProgressBar percent={card.usedPercent} tone={card.noteTone} />
      <View className="flex-row items-center justify-between">
        <Text
          className="font-geist-medium text-label-sm"
          style={{ color: toneColor(card.noteTone) }}
        >
          {card.note}
        </Text>
        <Text
          accessibilityLabel={hidden ? 'limite oculto' : undefined}
          className="font-geist-medium text-label-sm text-on-surface-variant"
        >
          {`${availableLabel} de ${limitLabel} livre`}
        </Text>
      </View>
    </>
  );

  return (
    <Card
      variant="outlined"
      className="gap-stack-md bg-surface-container-low p-stack-lg"
      editLabel={`Editar ${card.name}`}
      onPress={onPress}
    >
      {body}
    </Card>
  );
}
