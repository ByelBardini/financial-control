import { Pressable, Text, View } from 'react-native';
import { Icon } from './Icon';

type TopBarProps = {
  hidden: boolean;
  onToggleHidden: () => void;
};

// Marca + botão de ocultar valores. O Pressable é o switch acessível (rótulo e
// estado), então o ícone interno fica decorativo; alvo de toque 44×44 + hitSlop.
export function TopBar({ hidden, onToggleHidden }: TopBarProps) {
  return (
    <View className="flex-row items-center justify-between px-container-margin py-stack-md">
      <Text className="font-hanken-bold text-headline-md text-primary">Pobrify</Text>
      <Pressable
        onPress={onToggleHidden}
        accessibilityRole="switch"
        accessibilityState={{ checked: hidden }}
        accessibilityLabel={hidden ? 'Mostrar valores' : 'Ocultar valores'}
        hitSlop={12}
        className="h-11 w-11 items-center justify-center"
      >
        <Icon name={hidden ? 'visibility_off' : 'visibility'} color="#cbc3d7" />
      </Pressable>
    </View>
  );
}
