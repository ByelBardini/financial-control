import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import * as api from '../../src/api/accounts';
import {
  useAccount,
  useArchiveAccount,
  useCreateAccount,
  useUpdateAccount,
} from '../../src/hooks/useAccountMutations';
import type { NewAccountInput } from '../../src/types/accounts';

jest.mock('../../src/api/accounts');

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  const invalidateSpy = jest.spyOn(client, 'invalidateQueries');
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return { invalidateSpy, wrapper };
}

const newInput: NewAccountInput = {
  name: 'Nubank',
  accountType: 'checking',
  openingBalanceCents: 50000,
  icon: 'account_balance',
  tone: 'neutral',
  dotColor: '#d0bcff',
};

function expectInvalidatedBothScreens(invalidateSpy: jest.SpyInstance) {
  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['accounts'] });
  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['contas'] });
}

describe('useCreateAccount', () => {
  it('cria a conta e invalida dashboard + contas', async () => {
    jest.mocked(api.createAccount).mockResolvedValue({ id: 'a1' } as never);
    const { invalidateSpy, wrapper } = setup();
    const { result } = await renderHook(() => useCreateAccount(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(newInput);
    });

    expect(api.createAccount).toHaveBeenCalledWith(newInput);
    expectInvalidatedBothScreens(invalidateSpy);
  });
});

describe('useUpdateAccount', () => {
  it('edita a conta e invalida dashboard + contas', async () => {
    jest.mocked(api.updateAccount).mockResolvedValue({ id: 'a1' } as never);
    const { invalidateSpy, wrapper } = setup();
    const { result } = await renderHook(() => useUpdateAccount(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        id: 'a1',
        input: {
          name: 'Itaú',
          accountType: 'checking',
          icon: 'account_balance',
          tone: 'neutral',
          dotColor: '#004990',
        },
      });
    });

    expect(api.updateAccount).toHaveBeenCalledWith('a1', expect.objectContaining({ name: 'Itaú' }));
    expectInvalidatedBothScreens(invalidateSpy);
  });
});

describe('useArchiveAccount', () => {
  it('arquiva a conta e invalida dashboard + contas', async () => {
    jest.mocked(api.archiveAccount).mockResolvedValue(undefined);
    const { invalidateSpy, wrapper } = setup();
    const { result } = await renderHook(() => useArchiveAccount(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('a1');
    });

    expect(api.archiveAccount).toHaveBeenCalledWith('a1');
    expectInvalidatedBothScreens(invalidateSpy);
  });
});

describe('useAccount', () => {
  it('não busca quando não há id', async () => {
    const { wrapper } = setup();
    const { result } = await renderHook(() => useAccount(undefined), { wrapper });
    expect(api.getAccount).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('busca o detalhe quando há id', async () => {
    jest.mocked(api.getAccount).mockResolvedValue({ id: 'a9', name: 'Nubank' } as never);
    const { wrapper } = setup();
    const { result } = await renderHook(() => useAccount('a9'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.getAccount).toHaveBeenCalledWith('a9');
  });
});
