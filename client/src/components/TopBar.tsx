import { Pressable, Text, View } from 'react-native';
import { Icon } from './Icon';
import { BrandLogo } from './BrandLogo';

type TopBarProps = {
  hidden: boolean;
  onToggleHidden: () => void;
  onLogout?: () => void;
};

// Marca + ações do topo (ocultar valores e, quando há sessão, sair). Cada
// Pressable é o alvo acessível com rótulo próprio; os ícones ficam decorativos.
// Alvo de toque 44×44 + hitSlop.
export function TopBar({ hidden, onToggleHidden, onLogout }: TopBarProps) {
  return (
    <View className="flex-row items-center justify-between px-container-margin py-stack-md">
      <View className="flex-row items-center gap-stack-sm">
        <BrandLogo size={24} />
        <Text className="font-hanken-bold text-headline-md text-primary">Pobrify</Text>
      </View>
      <View className="flex-row items-center gap-stack-sm">
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
        {onLogout ? (
          <Pressable
            onPress={onLogout}
            accessibilityRole="button"
            accessibilityLabel="Sair"
            hitSlop={12}
            className="h-11 w-11 items-center justify-center"
          >
            <Icon name="logout" color="#cbc3d7" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
