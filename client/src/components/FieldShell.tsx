import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

type FieldShellProps = {
  label: string;
  error?: string;
  children: ReactNode;
};

// Casca comum dos campos de formulário: label em CAIXA ALTA + conteúdo (input ou
// gatilho) + mensagem de erro (alert pro leitor de tela). FormField e SelectField
// compõem isto pra manter label/erro idênticos em todos os campos.
export function FieldShell({ label, error, children }: FieldShellProps) {
  return (
    <View className="gap-stack-sm">
      <Text className="font-geist-semibold text-label-sm uppercase text-on-surface-variant">
        {label}
      </Text>
      {children}
      {error ? (
        <Text accessibilityRole="alert" className="text-label-sm text-error">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
