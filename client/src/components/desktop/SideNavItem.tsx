import { Pressable, Text } from 'react-native';
import { Icon, type IconName } from '../Icon';

type SideNavItemProps = {
  label: string;
  icon: IconName;
  active?: boolean;
  onPress?: () => void;
};

// Link da sidebar. role="button" + selected no ativo. Sem onPress (destino ainda
// decorativo) o clique não faz nada.
export function SideNavItem({ label, icon, active = false, onPress }: SideNavItemProps) {
  const containerClass = active ? 'bg-surface-container-highest' : '';
  const textClass = active ? 'text-primary' : 'text-on-surface-variant';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      onPress={onPress}
      className={`flex-row items-center gap-stack-md rounded-lg px-base py-stack-md ${containerClass}`}
    >
      <Icon name={icon} size={20} color={active ? '#d0bcff' : '#cbc3d7'} />
      <Text className={`font-geist-medium text-label-md ${textClass}`}>{label}</Text>
    </Pressable>
  );
}
