import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { AuthenticatedApp } from './AuthenticatedApp';
import { CreateAccountScreen } from '../screens/CreateAccountScreen';
import { LoginScreen } from '../screens/LoginScreen';

// Gate de sessão (é aqui + no 401 do server que mora "não dá pra entrar sem
// logar"): enquanto carrega, nada; sem sessão, o fluxo de auth (login/criar conta);
// com sessão, o dashboard. A sub-rota login/criarConta é estado local (sem lib de routing).
export function RootNavigator() {
  const { status, signIn, signOut } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'createAccount'>('login');

  if (status === 'loading') {
    return null;
  }

  if (status === 'authenticated') {
    return <AuthenticatedApp onLogout={signOut} />;
  }

  if (authView === 'createAccount') {
    return <CreateAccountScreen onBack={() => setAuthView('login')} />;
  }

  return (
    <LoginScreen onSubmit={signIn} onNavigateToCreateAccount={() => setAuthView('createAccount')} />
  );
}
