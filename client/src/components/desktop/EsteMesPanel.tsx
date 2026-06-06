import { Text, View } from 'react-native';
import { DiagnosisCard } from '../DiagnosisCard';
import { ProgressBar } from '../ProgressBar';
import type { Diagnosis, EsteMes } from '../../types/dashboard';

type EsteMesPanelProps = {
  esteMes: EsteMes;
  diagnosis: Diagnosis;
};

// Coluna "Este Mês": % da receita gasta, maior vilão e o card de diagnóstico.
export function EsteMesPanel({ esteMes, diagnosis }: EsteMesPanelProps) {
  return (
    <View className="gap-stack-lg p-stack-lg">
      <Text className="font-geist-medium text-label-sm uppercase text-on-surface-variant">
        Este Mês
      </Text>
      <Text className="font-hanken-semibold text-headline-sm text-on-surface">
        {`Você gastou ${esteMes.spentPercent}% da sua receita.`}
      </Text>
      <View className="gap-stack-sm">
        <View className="flex-row items-center justify-between">
          <Text className="font-geist-medium text-label-sm text-on-surface-variant">
            Maior vilão
          </Text>
          <Text className="font-geist-medium text-label-md text-primary">
            {esteMes.biggestVillain}
          </Text>
        </View>
        <ProgressBar percent={esteMes.spentPercent} tone="primary" />
      </View>
      <DiagnosisCard diagnosis={diagnosis} />
    </View>
  );
}
