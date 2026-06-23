import { Text, View } from 'react-native';
import { Icon } from '../Icon';
import { toneColor } from '../../theme/colors';
import { formatPercent } from '../../lib/percent';
import type { RiskAssessment } from '../../types/investimentos';

type RiskAssessmentCardProps = {
  risk: RiskAssessment;
};

// Card de "Avaliação de Risco" no estilo do mockup (SEM barra/PanicMeter): cabeçalho com alerta +
// status grande colorido (ícone de tendência + nível) derivado do lucro/perda + o resultado geral
// + uma frase ácida no rodapé. As cores vêm do tom do desempenho (verde lucro / vermelho prejuízo).
export function RiskAssessmentCard({ risk }: RiskAssessmentCardProps) {
  const color = toneColor(risk.levelTone);
  return (
    <View className="gap-stack-md rounded-xl border border-outline-variant bg-surface-container p-gutter">
      <View className="flex-row items-center gap-stack-sm">
        <Icon name="warning" size={18} color={color} />
        <Text className="font-geist-semibold text-label-md uppercase text-on-surface">
          Avaliação de Risco
        </Text>
      </View>

      <Text className="font-geist-medium text-label-sm text-on-surface-variant">
        Como andam seus ativos, pelo lucro/perda:
      </Text>

      <View className="items-center gap-stack-sm py-stack-md">
        <Icon name={risk.icon} size={44} color={color} />
        <Text className="font-hanken-bold text-headline-sm uppercase" style={{ color }}>
          {risk.level}
        </Text>
        <Text className="text-center font-geist-medium text-label-sm text-on-surface-variant">
          {risk.summary}
        </Text>
        <Text className="font-geist-semibold text-label-sm" style={{ color }}>
          Resultado geral: {formatPercent(risk.resultPct)}
        </Text>
      </View>

      <View className="rounded-lg border border-outline-variant bg-surface-container-highest p-stack-md">
        <Text className="text-center font-geist-medium text-label-sm italic text-on-surface-variant">
          {`"${risk.quip}"`}
        </Text>
      </View>
    </View>
  );
}
