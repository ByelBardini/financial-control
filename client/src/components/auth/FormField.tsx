import type { ReactNode } from 'react';
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
  rightSlot?: ReactNode;
  testID?: string;
};

// Campo de texto com label, estado de erro e um slot opcional à direita (ex.: o
// toggle de senha). O label vira o accessibilityLabel do input; o erro é um
// `alert` pro leitor de tela anunciar. Estilo via tokens do tema (NativeWind).
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
  rightSlot,
  testID,
}: FormFieldProps) {
  return (
    <View className="gap-stack-sm">
      <Text className="font-geist-semibold text-label-sm uppercase text-on-surface-variant">
        {label}
      </Text>
      <View className="justify-center">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#958ea0"
          keyboardType={keyboardType}
          autoComplete={autoComplete}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry}
          accessibilityLabel={label}
          testID={testID}
          className={`rounded-lg border bg-surface-container-lowest px-gutter py-stack-md text-body-md text-on-surface focus:border-primary ${
            error ? 'border-error' : 'border-outline-variant'
          } ${rightSlot ? 'pr-14' : ''}`}
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
