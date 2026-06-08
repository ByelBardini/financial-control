import { Pressable, Text, View } from 'react-native';
import { Icon } from '../Icon';
import { ACCOUNT_TYPES } from '../../lib/accountForm';
import { colors } from '../../theme/colors';
import type { AccountType } from '../../types/accounts';

type AccountTypeSelectProps = {
  value: AccountType;
  onChange: (type: AccountType) => void;
};

// Seletor segmentado de tipo de conta (Banco/Vale/Cartão/Dinheiro). Cada opção é um
// Pressable acessível com estado selected; espelha o padrão do BottomNavItem.
export function AccountTypeSelect({ value, onChange }: AccountTypeSelectProps) {
  return (
    <View className="flex-row gap-stack-sm">
      {ACCOUNT_TYPES.map((type) => {
        const selected = type.value === value;
        return (
          <Pressable
            key={type.value}
            onPress={() => onChange(type.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={type.label}
            className={`min-h-11 flex-1 items-center justify-center gap-stack-sm rounded-lg border py-stack-md ${
              selected ? 'border-primary bg-surface-container-highest' : 'border-outline-variant'
            }`}
          >
            <Icon
              name={type.defaultIcon}
              size={20}
              color={selected ? colors.primary : colors.onSurfaceVariant}
            />
            <Text
              className={`font-geist-medium text-label-sm ${
                selected ? 'text-primary' : 'text-on-surface-variant'
              }`}
            >
              {type.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
