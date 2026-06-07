import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AuthButton } from '../components/auth/AuthButton';
import { AuthLayout } from '../components/auth/AuthLayout';
import { FormField } from '../components/auth/FormField';
import { validateAccountEmail } from '../lib/authValidation';

type CreateAccountScreenProps = {
  onBack: () => void;
};

// Criar conta (só front): um campo de e-mail. Acesso é por aprovação manual —
// então o envio só valida o e-mail e mostra a confirmação do pedido, sem rede.
export function CreateAccountScreen({ onBack }: CreateAccountScreenProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    const message = validateAccountEmail(email);
    setError(message ?? undefined);
    if (!message) setSubmitted(true);
  }

  if (submitted) {
    return (
      <AuthLayout>
        <View className="gap-stack-lg">
          <Text
            accessibilityRole="header"
            className="font-hanken-bold text-headline-md text-on-surface"
          >
            Pedido enviado!
          </Text>
          <Text className="font-hanken text-body-md text-on-surface-variant">
            Recebemos seu pedido. Se for aprovado, você recebe um e-mail, se não, nunca vai saber.
          </Text>
          <AuthButton label="Voltar ao login" onPress={onBack} />
        </View>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <View className="gap-stack-lg">
        <View className="gap-stack-sm">
          <Text
            accessibilityRole="header"
            className="font-hanken-bold text-headline-md text-on-surface"
          >
            Organize sua falência premium
          </Text>
          <Text className="font-hanken text-body-md text-on-surface-variant">
            Deixa seu e-mail aí. Todo cadastro novo precisa ser aprovado, nem todo mundo merece
            entrar pro clube.
          </Text>
        </View>

        <FormField
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          placeholder="voce@falido.com"
          error={error}
          keyboardType="email-address"
          autoComplete="email"
          autoCapitalize="none"
        />

        <AuthButton label="Implorar acesso" onPress={handleSubmit} />

        <Pressable
          onPress={onBack}
          accessibilityRole="link"
          accessibilityLabel="Entrar"
          hitSlop={8}
          className="min-h-11 flex-row items-center justify-center gap-stack-sm"
        >
          <Text className="font-hanken text-body-md text-on-surface-variant">
            Já tem uma conta?
          </Text>
          <Text className="font-geist-semibold text-body-md text-primary">Entrar</Text>
        </Pressable>
      </View>
    </AuthLayout>
  );
}
