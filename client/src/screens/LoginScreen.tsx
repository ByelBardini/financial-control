import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ApiError } from '../api/client';
import { AuthButton } from '../components/auth/AuthButton';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Checkbox } from '../components/auth/Checkbox';
import { FormField } from '../components/auth/FormField';
import { PasswordField } from '../components/auth/PasswordField';
import { validateLoginForm, type LoginErrors } from '../lib/authValidation';

type LoginScreenProps = {
  onSubmit: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  onNavigateToCreateAccount: () => void;
};

// Tela de login: valida no client e, se ok, chama onSubmit (auth real via
// AuthContext). Mostra "carregando" no botão e o erro do server (401 → credencial
// inválida). Em sucesso o AuthProvider vira o status e o RootNavigator troca a tela.
export function LoginScreen({ onSubmit, onNavigateToCreateAccount }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [serverError, setServerError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const nextErrors = validateLoginForm({ email, password });
    setErrors(nextErrors);
    setServerError(undefined);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await onSubmit(email, password, rememberMe);
    } catch (err) {
      setServerError(
        err instanceof ApiError && err.status === 401
          ? 'E-mail ou senha incorretos. Nem o login você acerta?'
          : 'Não rolou conectar agora. Tenta de novo.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <View className="gap-stack-lg">
        <View className="gap-stack-sm">
          <Text
            accessibilityRole="header"
            className="font-hanken-bold text-headline-md text-on-surface"
          >
            Entrar
          </Text>
          <Text className="font-hanken text-body-md text-on-surface-variant">
            Que bom te ver de novo. As dívidas também sentiram saudade.
          </Text>
        </View>

        <View className="gap-gutter">
          <FormField
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            placeholder="voce@falido.com"
            error={errors.email}
            keyboardType="email-address"
            autoComplete="email"
            autoCapitalize="none"
          />
          <PasswordField
            label="Senha"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            error={errors.password}
          />
          <Checkbox
            label="Lembre de mim (como se as dívidas esquecessem)"
            checked={rememberMe}
            onChange={setRememberMe}
          />
        </View>

        {serverError ? (
          <Text accessibilityRole="alert" className="text-label-sm text-error">
            {serverError}
          </Text>
        ) : null}

        <AuthButton label="Entrar" onPress={handleSubmit} loading={submitting} />

        <Pressable
          onPress={onNavigateToCreateAccount}
          accessibilityRole="link"
          accessibilityLabel="Crie sua falência premium"
          hitSlop={8}
          className="min-h-11 flex-row items-center justify-center gap-stack-sm"
        >
          <Text className="font-hanken text-body-md text-on-surface-variant">Novo por aqui?</Text>
          <Text className="font-geist-semibold text-body-md text-primary">
            Crie sua falência premium
          </Text>
        </Pressable>
      </View>
    </AuthLayout>
  );
}
