import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import * as authApi from '../../src/api/auth';
import { ApiError } from '../../src/api/client';
import { queryClient } from '../../src/api/queryClient';
import { AuthProvider, useAuth } from '../../src/auth/AuthContext';
import * as tokenStorage from '../../src/lib/tokenStorage';

jest.mock('../../src/api/auth');
jest.mock('../../src/lib/tokenStorage');

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(tokenStorage.getStoredToken).mockResolvedValue(null);
  jest.mocked(tokenStorage.storeToken).mockResolvedValue();
  jest.mocked(tokenStorage.clearStoredToken).mockResolvedValue();
});

describe('AuthContext', () => {
  it('sem token guardado → unauthenticated', async () => {
    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('unauthenticated'));
    expect(result.current.user).toBeNull();
  });

  it('restaura a sessão quando há token válido', async () => {
    jest.mocked(tokenStorage.getStoredToken).mockResolvedValue('tok-1');
    jest.mocked(authApi.me).mockResolvedValue({ id: 'u', email: 'a@b.com', name: 'A' });

    const { result } = await renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe('authenticated'));
    expect(result.current.user?.email).toBe('a@b.com');
  });

  it('descarta token inválido e cai pro login', async () => {
    jest.mocked(tokenStorage.getStoredToken).mockResolvedValue('tok-bad');
    jest.mocked(authApi.me).mockRejectedValue(new ApiError('expirado', 401));

    const { result } = await renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe('unauthenticated'));
    expect(tokenStorage.clearStoredToken).toHaveBeenCalled();
  });

  it('signIn autentica, guarda o token e limpa o cache', async () => {
    const clearSpy = jest.spyOn(queryClient, 'clear');
    jest
      .mocked(authApi.login)
      .mockResolvedValue({ token: 'tok-new', user: { id: 'u', email: 'a@b.com', name: 'A' } });

    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('unauthenticated'));

    await act(async () => {
      await result.current.signIn('a@b.com', 'segredo', true);
    });

    expect(result.current.status).toBe('authenticated');
    expect(result.current.user?.email).toBe('a@b.com');
    expect(tokenStorage.storeToken).toHaveBeenCalledWith('tok-new');
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  it('signIn que falha propaga o erro e mantém unauthenticated', async () => {
    jest.mocked(authApi.login).mockRejectedValue(new ApiError('credenciais inválidas', 401));

    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('unauthenticated'));

    let caught: unknown;
    await act(async () => {
      caught = await result.current.signIn('a@b.com', 'errada', false).catch((e: unknown) => e);
    });

    expect(caught).toMatchObject({ status: 401 });
    expect(result.current.status).toBe('unauthenticated');
  });

  it('signOut limpa sessão, token e cache', async () => {
    const clearSpy = jest.spyOn(queryClient, 'clear');
    jest.mocked(tokenStorage.getStoredToken).mockResolvedValue('tok-1');
    jest.mocked(authApi.me).mockResolvedValue({ id: 'u', email: 'a@b.com', name: 'A' });

    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('authenticated'));

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.status).toBe('unauthenticated');
    expect(result.current.user).toBeNull();
    expect(tokenStorage.clearStoredToken).toHaveBeenCalled();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  it('useAuth fora do AuthProvider lança', async () => {
    await expect(renderHook(() => useAuth())).rejects.toThrow(/AuthProvider/);
  });
});
