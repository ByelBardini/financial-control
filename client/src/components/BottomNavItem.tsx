import { Text, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { colors } from '../theme/colors';

type BottomNavItemProps = {
  label: string;
  icon: IconName;
  active?: boolean;
};

// Item da barra inferior (estático, sem navegação ainda). role="button" +
// estado selected pro item ativo; alvo de toque mínimo de 44px.
export function BottomNavItem({ label, icon, active = false }: BottomNavItemProps) {
  const textClass = active ? 'text-secondary' : 'text-on-surface-variant';
  return (
    <View
      accessible
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      className="min-h-11 flex-1 items-center justify-center gap-stack-sm py-stack-sm"
    >
      <Icon name={icon} size={24} color={active ? colors.secondary : colors.onSurfaceVariant} />
      <Text className={`font-geist-medium text-label-sm ${textClass}`}>{label}</Text>
    </View>
  );
}
