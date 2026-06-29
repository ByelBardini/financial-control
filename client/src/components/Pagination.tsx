import { Pressable, Text, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { colors } from '../theme/colors';

type PaginationProps = {
  page: number;
  pageCount: number;
  onPrev: () => void;
  onNext: () => void;
};

// Paginação numerada do desktop (Anterior / Próxima + "Página X de N"). Os botões
// desabilitam nas pontas (accessibilityState disabled + onPress só quando habilitado).
export function Pagination({ page, pageCount, onPrev, onNext }: PaginationProps) {
  const total = Math.max(pageCount, 1);
  return (
    <View className="flex-row items-center justify-between p-stack-lg">
      <PagerButton
        label="Anterior"
        icon="chevron_left"
        iconLeft
        disabled={page <= 1}
        onPress={onPrev}
      />
      <Text className="font-geist-medium text-label-sm uppercase text-on-surface-variant">
        Página {page} de {total}
      </Text>
      <PagerButton
        label="Próxima"
        icon="chevron_right"
        disabled={page >= pageCount}
        onPress={onNext}
      />
    </View>
  );
}

type PagerButtonProps = {
  label: string;
  icon: IconName;
  disabled: boolean;
  onPress: () => void;
  iconLeft?: boolean;
};

function PagerButton({ label, icon, disabled, onPress, iconLeft = false }: PagerButtonProps) {
  const color = disabled ? colors.outlineVariant : colors.onSurfaceVariant;
  const text = (
    <Text
      className={`font-geist-medium text-label-sm ${disabled ? 'text-outline-variant' : 'text-on-surface-variant'}`}
    >
      {label}
    </Text>
  );
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={8}
      className="min-h-[44px] flex-row items-center gap-stack-sm px-stack-sm"
    >
      {iconLeft ? <Icon name={icon} size={16} color={color} /> : null}
      {text}
      {iconLeft ? null : <Icon name={icon} size={16} color={color} />}
    </Pressable>
  );
}
