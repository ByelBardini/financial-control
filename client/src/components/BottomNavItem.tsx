import { Pressable, Text } from 'react-native';
import { Icon, type IconName } from './Icon';
import { colors } from '../theme/colors';

type BottomNavItemProps = {
  label: string;
  icon: IconName;
  active?: boolean;
  onPress?: () => void;
};

// Item da barra inferior. role="button" + estado selected pro ativo; alvo de toque
// mínimo de 44px. Sem onPress (destinos ainda decorativos) o toque não faz nada.
export function BottomNavItem({ label, icon, active = false, onPress }: BottomNavItemProps) {
  const textClass = active ? 'text-secondary' : 'text-on-surface-variant';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      onPress={onPress}
      className="min-h-11 flex-1 items-center justify-center gap-stack-sm py-stack-sm"
    >
      <Icon name={icon} size={24} color={active ? colors.secondary : colors.onSurfaceVariant} />
      <Text className={`font-geist-medium text-label-sm ${textClass}`}>{label}</Text>
    </Pressable>
  );
}
