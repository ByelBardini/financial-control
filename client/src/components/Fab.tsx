import { Pressable } from 'react-native';
import { colors } from '../theme/colors';
import { Icon, type IconName } from './Icon';

type FabProps = {
  iconName: IconName;
  accessibilityLabel: string;
  onPress: () => void;
  bottom: number;
  disabled?: boolean;
};

// Botão de ação flutuante (round, só ícone) das telas mobile. Fixo no canto inferior
// direito; `bottom` vem do consumidor (safe-area + altura da BottomNav). Cor do glifo
// pelo token on-primary-container (escuro sobre o lavanda do primary), nunca hex solto.
export function Fab({ iconName, accessibilityLabel, onPress, bottom, disabled = false }: FabProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      className={`absolute right-6 h-14 w-14 items-center justify-center rounded-full bg-primary ${disabled ? 'opacity-60' : ''}`}
      style={{ bottom }}
    >
      <Icon name={iconName} size={28} color={colors.onPrimaryContainer} />
    </Pressable>
  );
}
