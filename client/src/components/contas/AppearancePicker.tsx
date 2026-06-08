import { Pressable, Text, View } from 'react-native';
import { Icon, type IconName } from '../Icon';
import { COLOR_PRESETS, ICON_PRESETS } from '../../lib/accountForm';
import { colors } from '../../theme/colors';

type AppearancePickerProps = {
  dotColor: string;
  icon: IconName;
  onChangeColor: (color: string) => void;
  onChangeIcon: (icon: IconName) => void;
};

// Escolha de aparência por presets: paleta de cores + grade de ícones. Cada item é
// um Pressable acessível (selected) — pra distinguir contas do mesmo tipo.
export function AppearancePicker({
  dotColor,
  icon,
  onChangeColor,
  onChangeIcon,
}: AppearancePickerProps) {
  return (
    <View className="gap-stack-md">
      <View className="gap-stack-sm">
        <Text className="font-geist-semibold text-label-sm uppercase text-on-surface-variant">
          Cor
        </Text>
        <View className="flex-row flex-wrap gap-stack-sm">
          {COLOR_PRESETS.map((color) => {
            const selected = color === dotColor;
            return (
              <Pressable
                key={color}
                onPress={() => onChangeColor(color)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Cor ${color}`}
                className={`h-11 w-11 items-center justify-center rounded-full border-2 ${
                  selected ? 'border-on-surface' : 'border-transparent'
                }`}
              >
                <View className="h-6 w-6 rounded-full" style={{ backgroundColor: color }} />
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="gap-stack-sm">
        <Text className="font-geist-semibold text-label-sm uppercase text-on-surface-variant">
          Ícone
        </Text>
        <View className="flex-row flex-wrap gap-stack-sm">
          {ICON_PRESETS.map((name) => {
            const selected = name === icon;
            return (
              <Pressable
                key={name}
                onPress={() => onChangeIcon(name)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Ícone ${name}`}
                className={`h-11 w-11 items-center justify-center rounded-lg border ${
                  selected
                    ? 'border-primary bg-surface-container-highest'
                    : 'border-outline-variant'
                }`}
              >
                <Icon
                  name={name}
                  size={20}
                  color={selected ? colors.primary : colors.onSurfaceVariant}
                />
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
