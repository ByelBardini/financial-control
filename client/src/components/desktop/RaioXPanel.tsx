import { Text, View } from 'react-native';
import { MoneyText } from '../MoneyText';
import { PanicMeter } from '../PanicMeter';
import { SectionHeading } from '../SectionHeading';
import type { PovertyXray } from '../../types/contas';

type RaioXPanelProps = {
  xray: PovertyXray;
  hidden: boolean;
};

// Painel "Raio-X de Pobreza" do desktop: linhas monetárias (dívidas/limite) +
// Panic Meter no rodapé.
export function RaioXPanel({ xray, hidden }: RaioXPanelProps) {
  return (
    <View className="gap-stack-md rounded-xl border border-outline-variant bg-surface-container-lowest p-stack-lg">
      <SectionHeading>{xray.title}</SectionHeading>
      <View className="gap-stack-sm">
        {xray.rows.map((row) => (
          <View key={row.label} className="flex-row items-center justify-between">
            <Text className="font-geist-medium text-label-sm text-on-surface-variant">
              {row.label}
            </Text>
            <MoneyText
              cents={row.cents}
              hidden={hidden}
              tone={row.tone}
              className="font-geist-semibold text-label-md"
            />
          </View>
        ))}
      </View>
      <PanicMeter panic={xray.panic} caption="Panic Meter™" />
    </View>
  );
}
