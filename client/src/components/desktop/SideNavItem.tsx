import { Text, View } from 'react-native';
import { Icon, type IconName } from '../Icon';

type SideNavItemProps = {
  label: string;
  icon: IconName;
  active?: boolean;
};

// Link da sidebar (estático por enquanto). role="button" + selected no ativo.
export function SideNavItem({ label, icon, active = false }: SideNavItemProps) {
  const containerClass = active ? 'bg-surface-container-highest' : '';
  const textClass = active ? 'text-primary' : 'text-on-surface-variant';
  return (
    <View
      accessible
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      className={`flex-row items-center gap-stack-md rounded-lg px-base py-stack-md ${containerClass}`}
    >
      <Icon name={icon} size={20} color={active ? '#d0bcff' : '#cbc3d7'} />
      <Text className={`font-geist-medium text-label-md ${textClass}`}>{label}</Text>
    </View>
  );
}
