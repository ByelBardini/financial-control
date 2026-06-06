import { Text, View } from 'react-native';
import { Icon } from './Icon';
import { MoneyText } from './MoneyText';
import { changeTone, formatDailyChange } from '../lib/percent';
import { toneColor } from '../theme/colors';
import type { Investment } from '../types/dashboard';

type InvestmentRowProps = {
  investment: Investment;
  hidden: boolean;
};

// Linha de investimento: ícone + nome + variação diária + valor. Valor e ícone
// seguem o tom da variação (verde sobe / vermelho cai); o texto do % já carrega
// o sinal, então a cor não é o único indicador.
export function InvestmentRow({ investment, hidden }: InvestmentRowProps) {
  const tone = changeTone(investment.dailyChangePct);
  return (
    <View className="flex-row items-center justify-between py-base">
      <View className="flex-row items-center gap-base">
        <Icon name={investment.icon} size={20} color={toneColor(tone)} />
        <View className="gap-stack-sm">
          <Text className="font-hanken text-body-md text-on-surface">{investment.name}</Text>
          <Text className="font-geist-medium text-label-sm text-on-surface-variant">
            {formatDailyChange(investment.dailyChangePct)}
          </Text>
        </View>
      </View>
      <MoneyText
        cents={investment.valueCents}
        hidden={hidden}
        tone={tone}
        className="font-geist-medium text-label-md"
      />
    </View>
  );
}
