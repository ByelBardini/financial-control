import { useRef } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { Icon, type IconName } from './Icon';
import type { MenuAnchor } from './transacoes/NewTransactionMenu';

type Variant = 'primary' | 'secondary' | 'tertiary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

type ButtonProps = {
  label: string;
  onPress: (anchor?: MenuAnchor) => void;
  variant?: Variant;
  size?: Size;
  iconName?: IconName;
  accessibilityLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  // Largura total + centralizado — arquétipo "submit" (auth + formulários), via size="lg".
  block?: boolean;
  // Mede o botão (measureInWindow) e devolve o retângulo no onPress — usado pelos
  // CTAs que ancoram um popover (Início/Transações). Sem isso, onPress() é seco.
  measureAnchor?: boolean;
};

const containerByVariant: Record<Variant, string> = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  tertiary: 'bg-surface-container-highest',
  ghost: '',
};

const textByVariant: Record<Variant, string> = {
  primary: 'text-on-primary-container',
  secondary: 'text-background',
  tertiary: 'text-primary',
  ghost: 'text-primary',
};

// Cor do glifo/spinner por variante — prop `color=`, então vem do tema (colors.ts), nunca hex solto.
const accentByVariant: Record<Variant, string> = {
  primary: colors.onPrimaryContainer,
  secondary: colors.background,
  tertiary: colors.primary,
  ghost: colors.primary,
};

const shapeBySize: Record<Size, string> = {
  sm: 'rounded-lg px-stack-md py-stack-sm',
  md: 'rounded-lg px-stack-md py-base',
  lg: 'h-14 rounded-full px-gutter justify-center',
};

const textSizeBySize: Record<Size, string> = {
  sm: 'text-label-sm',
  md: 'text-label-sm',
  lg: 'text-label-md',
};

const iconSizeBySize: Record<Size, number> = { sm: 14, md: 16, lg: 20 };

// Botão único do app — substitui os Pressable hand-rolled. Variante define cor/fundo,
// `measureAnchor` replica a âncora do popover, `loading`/`disabled` bloqueiam e marcam a11y.
export function Button({
  label,
  onPress,
  variant = 'tertiary',
  size = 'md',
  iconName,
  accessibilityLabel,
  loading = false,
  disabled = false,
  block = false,
  measureAnchor = false,
}: ButtonProps) {
  const ref = useRef<View>(null);
  const blocked = loading || disabled;
  const accent = accentByVariant[variant];

  const handlePress = () => {
    onPress(); // abre já (fallback test-safe)
    if (!measureAnchor) return;
    ref.current?.measureInWindow?.((x, y, width, height) => onPress({ x, y, width, height }));
  };

  return (
    <Pressable
      ref={ref}
      onPress={handlePress}
      disabled={blocked}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: blocked, busy: loading }}
      className={`flex-row items-center gap-stack-sm ${shapeBySize[size]} ${block ? 'w-full justify-center' : ''} ${containerByVariant[variant]} ${blocked ? 'opacity-60' : ''}`}
    >
      {loading ? <ActivityIndicator color={accent} /> : null}
      {iconName && !loading ? (
        <Icon name={iconName} size={iconSizeBySize[size]} color={accent} />
      ) : null}
      <Text className={`font-geist-semibold ${textSizeBySize[size]} ${textByVariant[variant]}`}>
        {label}
      </Text>
    </Pressable>
  );
}
