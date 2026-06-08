import { Pressable, Text } from 'react-native';
import { Icon } from './Icon';

type HideValuesToggleProps = {
  hidden: boolean;
  onToggleHidden: () => void;
};

// Pílula "Ocultar/Mostrar Valores" compartilhada pelos cabeçalhos desktop
// (DesktopHeader do dashboard, ContasHeader da tela de Contas): role `switch` com
// estado `checked = hidden` + ícone de visibilidade. Fonte única do toggle pra os
// dois headers não duplicarem o bloco.
export function HideValuesToggle({ hidden, onToggleHidden }: HideValuesToggleProps) {
  return (
    <Pressable
      onPress={onToggleHidden}
      accessibilityRole="switch"
      accessibilityState={{ checked: hidden }}
      accessibilityLabel={hidden ? 'Mostrar valores' : 'Ocultar valores'}
      hitSlop={8}
      className="flex-row items-center gap-stack-sm rounded-full border border-outline-variant bg-surface-container-lowest px-stack-md py-base"
    >
      <Icon name={hidden ? 'visibility_off' : 'visibility'} size={16} color="#cbc3d7" />
      <Text className="font-geist-medium text-label-sm text-on-surface-variant">
        {hidden ? 'Mostrar Valores' : 'Ocultar Valores'}
      </Text>
    </Pressable>
  );
}
