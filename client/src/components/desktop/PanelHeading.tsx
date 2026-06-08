import { Text, View } from 'react-native';
import { Icon, type IconName } from '../Icon';
import { SectionHeading } from '../SectionHeading';

type PanelHeadingProps = {
  icon: IconName;
  iconColor: string;
  title: string;
  count?: string;
};

// Cabeçalho de um painel do desktop de Contas: ícone colorido + título (role header)
// à esquerda e, quando há `count`, um rótulo à direita ("3 CONECTADOS"/"2 ATIVOS").
// Fonte única reusada por BancosPanel/CartoesPanel/ValesPanel.
export function PanelHeading({ icon, iconColor, title, count }: PanelHeadingProps) {
  const heading = (
    <View className="flex-row items-center gap-stack-sm">
      <Icon name={icon} size={20} color={iconColor} />
      <SectionHeading>{title}</SectionHeading>
    </View>
  );
  if (!count) return heading;
  return (
    <View className="flex-row items-center justify-between">
      {heading}
      <Text className="font-geist-medium text-label-sm uppercase text-on-surface-variant">
        {count}
      </Text>
    </View>
  );
}
