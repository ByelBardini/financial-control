import { ActivityIndicator, Pressable, Text } from 'react-native';

type AuthButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

// Botão primário full-width das telas de auth. `loading` mostra o spinner e,
// junto de `disabled`, bloqueia o toque e marca `busy`/`disabled` pra a11y.
export function AuthButton({ label, onPress, loading = false, disabled = false }: AuthButtonProps) {
  const blocked = loading || disabled;

  return (
    <Pressable
      onPress={onPress}
      disabled={blocked}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: blocked, busy: loading }}
      className={`h-14 w-full flex-row items-center justify-center gap-stack-md rounded-full bg-primary px-gutter ${
        blocked ? 'opacity-60' : ''
      }`}
    >
      {loading ? <ActivityIndicator color="#340080" /> : null}
      <Text className="font-geist-semibold text-label-md uppercase text-on-primary-container">
        {label}
      </Text>
    </Pressable>
  );
}
