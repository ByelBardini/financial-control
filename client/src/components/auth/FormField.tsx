import { useState, type ReactNode } from 'react';
import { Text, TextInput, View, type KeyboardTypeOptions, type TextInputProps } from 'react-native';

type FormFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  keyboardType?: KeyboardTypeOptions;
  autoComplete?: TextInputProps['autoComplete'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  secureTextEntry?: boolean;
  prefix?: string;
  rightSlot?: ReactNode;
  testID?: string;
};

// Campo de texto com label, estado de erro, um prefixo fixo opcional à esquerda
// (ex.: "R$") e um slot opcional à direita (ex.: o toggle de senha). O label vira
// o accessibilityLabel do input; o erro é um `alert` pro leitor de tela anunciar.
// Estilo via tokens do tema (NativeWind).
export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  keyboardType,
  autoComplete,
  autoCapitalize,
  secureTextEntry,
  prefix,
  rightSlot,
  testID,
}: FormFieldProps) {
  const [focused, setFocused] = useState(false);

  // Realce de foco na borda (estado) + `outline-none` pra matar o anel de foco
  // padrão do <input> na web (aquela "caixa branca" feia). No campo com prefixo a
  // borda fica no contêiner (pra o "R$" ficar dentro); nos demais, no próprio input.
  const borderClass = error
    ? 'border-error'
    : focused
      ? 'border-primary'
      : 'border-outline-variant';

  return (
    <View className="gap-stack-sm">
      <Text className="font-geist-semibold text-label-sm uppercase text-on-surface-variant">
        {label}
      </Text>
      <View
        className={
          prefix
            ? `flex-row items-center rounded-lg border bg-surface-container-lowest px-gutter ${borderClass}`
            : 'justify-center'
        }
      >
        {prefix ? <Text className="text-body-md text-on-surface-variant">{prefix}</Text> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor="#958ea0"
          keyboardType={keyboardType}
          autoComplete={autoComplete}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry}
          accessibilityLabel={label}
          testID={testID}
          className={
            prefix
              ? 'ml-4 flex-1 py-stack-md text-body-md text-on-surface outline-none'
              : `rounded-lg border bg-surface-container-lowest px-gutter py-stack-md text-body-md text-on-surface outline-none ${borderClass} ${
                  rightSlot ? 'pr-14' : ''
                }`
          }
        />
        {rightSlot ? <View className="absolute right-1">{rightSlot}</View> : null}
      </View>
      {error ? (
        <Text accessibilityRole="alert" className="text-label-sm text-error">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
