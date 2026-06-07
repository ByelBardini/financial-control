import { useState } from 'react';
import { Pressable } from 'react-native';
import { Icon } from '../Icon';
import { FormField } from './FormField';

type PasswordFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  testID?: string;
};

// Compõe o FormField com `secureTextEntry` controlado por um botão de olho. O
// estado de visibilidade é local (só visual); o Pressable é o alvo acessível
// (rótulo "Mostrar/Ocultar senha") com área de toque 44×44.
export function PasswordField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  testID,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <FormField
      label={label}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      error={error}
      secureTextEntry={!visible}
      autoComplete="password"
      autoCapitalize="none"
      testID={testID}
      rightSlot={
        <Pressable
          onPress={() => setVisible((current) => !current)}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Ocultar senha' : 'Mostrar senha'}
          hitSlop={12}
          className="h-11 w-11 items-center justify-center"
        >
          <Icon name={visible ? 'visibility_off' : 'visibility'} color="#cbc3d7" size={20} />
        </Pressable>
      }
    />
  );
}
