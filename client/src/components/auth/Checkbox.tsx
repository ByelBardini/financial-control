import { Pressable, Text, View } from 'react-native';
import { Icon } from '../Icon';

type CheckboxProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

// Checkbox acessível (role/estado `checked`) com a caixa e o rótulo num só alvo
// de toque (≥44px). O ícone de check é decorativo — o rótulo já dá o significado.
export function Checkbox({ label, checked, onChange }: CheckboxProps) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      hitSlop={8}
      className="min-h-11 flex-row items-center gap-stack-md"
    >
      <View
        className={`h-5 w-5 items-center justify-center rounded border ${
          checked ? 'border-primary bg-primary' : 'border-outline-variant'
        }`}
      >
        {checked ? <Icon name="check" size={16} color="#340080" /> : null}
      </View>
      <Text className="text-body-md text-on-surface-variant">{label}</Text>
    </Pressable>
  );
}
