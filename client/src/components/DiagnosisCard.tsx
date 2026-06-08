import { Text, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { colors } from '../theme/colors';
import type { Diagnosis } from '../types/dashboard';

// icon é opcional (default 'medical_services' = diagnóstico do dashboard). A tela
// de Contas reusa este card pra "Dica de Gestão" passando icon="lightbulb".
type DiagnosisCardProps = { diagnosis: Diagnosis; icon?: IconName };

// Card de diagnóstico adaptado do desktop: faixa lateral primária + ironia.
export function DiagnosisCard({ diagnosis, icon = 'medical_services' }: DiagnosisCardProps) {
  return (
    <View className="gap-stack-sm border-l-2 border-primary bg-surface-container-low p-stack-md">
      <View className="flex-row items-center gap-stack-sm">
        <Icon name={icon} size={16} color={colors.primary} />
        <Text className="font-geist-medium text-label-sm text-primary">{diagnosis.title}</Text>
      </View>
      <Text className="font-hanken text-body-md text-on-surface-variant">{diagnosis.body}</Text>
    </View>
  );
}
