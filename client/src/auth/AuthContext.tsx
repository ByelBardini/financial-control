import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { login as loginApi, me as meApi, type AuthUser } from '../api/auth';
import { setAuthToken } from '../api/client';
import { queryClient } from '../api/queryClient';
import { clearStoredToken, getStoredToken, storeToken } from '../lib/tokenStorage';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  signIn: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// AuthProvider é dono do estado de sessão: no mount restaura o token do storage e
// valida com /auth/me; expõe signIn/signOut. Em toda troca de sessão limpa o cache
// do React Query, pra dados de um usuário NUNCA aparecerem pro outro.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const token = await getStoredToken();
      if (!token) {
        if (active) setStatus('unauthenticated');
        return;
      }
      setAuthToken(token);
      try {
        const current = await meApi();
        if (!active) return;
        setUser(current);
        setStatus('authenticated');
      } catch {
        setAuthToken(null);
        await clearStoredToken();
        if (active) setStatus('unauthenticated');
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string, rememberMe: boolean) => {
    const { token, user: signedIn } = await loginApi(email, password, rememberMe);
    await storeToken(token);
    setAuthToken(token);
    queryClient.clear(); // sessão nova → zera o cache do usuário anterior
    setUser(signedIn);
    setStatus('authenticated');
  }, []);

  const signOut = useCallback(async () => {
    setAuthToken(null);
    await clearStoredToken();
    queryClient.clear();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, signIn, signOut }),
    [status, user, signIn, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// useAuth lê o contexto de sessão. Lança se usado fora do AuthProvider (erro de dev).
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  }
  return ctx;
}
