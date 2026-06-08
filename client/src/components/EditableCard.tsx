import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

type EditableCardProps = {
  className: string;
  editLabel: string;
  onPress?: () => void;
  children: ReactNode;
};

// Card que vira um Pressable acessível ("Editar X") quando há onPress, e uma View comum
// quando não. Compartilhado pelos cards de Banco/Cartão/Vale (mobile) e pela linha de
// banco (desktop) — concentra a a11y do alvo de edição num lugar só.
export function EditableCard({ className, editLabel, onPress, children }: EditableCardProps) {
  if (onPress) {
    return (
      <Pressable
        className={className}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={editLabel}
      >
        {children}
      </Pressable>
    );
  }
  return <View className={className}>{children}</View>;
}
