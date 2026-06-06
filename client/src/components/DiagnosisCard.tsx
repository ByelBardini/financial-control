import { Text, View } from 'react-native';
import { Icon } from './Icon';
import { colors } from '../theme/colors';
import type { Diagnosis } from '../types/dashboard';

type DiagnosisCardProps = { diagnosis: Diagnosis };

// Card de diagnóstico adaptado do desktop: faixa lateral primária + ironia.
export function DiagnosisCard({ diagnosis }: DiagnosisCardProps) {
  return (
    <View className="gap-stack-sm border-l-2 border-primary bg-surface-container-low p-stack-md">
      <View className="flex-row items-center gap-stack-sm">
        <Icon name="medical_services" size={16} color={colors.primary} />
        <Text className="font-geist-medium text-label-sm text-primary">{diagnosis.title}</Text>
      </View>
      <Text className="font-hanken text-body-md text-on-surface-variant">{diagnosis.body}</Text>
    </View>
  );
}
