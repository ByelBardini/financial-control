import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

type CardVariant = 'outlined' | 'accent' | 'row' | 'plain';

type CardProps = {
  children: ReactNode;
  variant?: CardVariant;
  className?: string;
  onPress?: () => void;
  editLabel?: string;
};

// Moldura por variante: `outlined` = card de dado (frame compartilhado; bg/padding
// ficam no `className` porque card de 1 linha e card de várias linhas pedem espaços
// diferentes); `accent` = nota/dica com faixa lateral (estilo fixo, reusado tal qual);
// `row` = linha de tabela no desktop; `plain` = sem moldura (linha simples, só o alvo
// de toque + a11y). O layout interno (flex/gap) vem por `className`. Com onPress vira
// Pressable acessível ("Editar X"); senão, View — absorve o papel do antigo EditableCard.
const frameByVariant: Record<CardVariant, string> = {
  outlined: 'rounded-xl border border-outline-variant',
  accent: 'border-l-2 border-primary bg-surface-container-low p-stack-md',
  row: 'border-b border-grid-line py-stack-md',
  plain: '',
};

export function Card({
  children,
  variant = 'outlined',
  className = '',
  onPress,
  editLabel,
}: CardProps) {
  const frame = `${frameByVariant[variant]} ${className}`;
  if (onPress) {
    return (
      <Pressable
        className={frame}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={editLabel}
      >
        {children}
      </Pressable>
    );
  }
  return <View className={frame}>{children}</View>;
}
