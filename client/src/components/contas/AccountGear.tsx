import { Pressable } from 'react-native';
import { Icon } from '../Icon';

type AccountGearProps = { name: string; onEdit: () => void };

// Engrenagem de "Editar conta". Como tocar no card virou Transferir, a edição/arquivamento passou
// a ser esta ação secundária. É um Pressable IRMÃO do corpo (não aninhado) — no web, aninhar dois
// onPress faria o clique borbulhar e disparar os dois; como irmão, cada um captura só o seu toque.
export function AccountGear({ name, onEdit }: AccountGearProps) {
  return (
    <Pressable
      onPress={onEdit}
      accessibilityRole="button"
      accessibilityLabel={`Editar ${name}`}
      hitSlop={8}
      className="h-9 w-9 items-center justify-center rounded-full"
    >
      <Icon name="settings" size={18} color="#cbc3d7" accessibilityLabel={`Editar ${name}`} />
    </Pressable>
  );
}
