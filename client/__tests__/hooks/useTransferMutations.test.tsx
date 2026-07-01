import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import * as api from '../../src/api/transfers';
import { useCreateTransfer } from '../../src/hooks/useTransferMutations';
import type { CreateTransferInput } from '../../src/types/transfers';

jest.mock('../../src/api/transfers');

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

const input: CreateTransferInput = {
  originAccountId: 'a1',
  destinationAccountId: 'a2',
  amountCents: 10000,
  occurredOn: '2026-06-15',
};

describe('useCreateTransfer', () => {
  it('transfere e invalida transacoes/accounts/contas/dashboard', async () => {
    jest.mocked(api.createTransfer).mockResolvedValue({ groupId: 'g1' } as never);
    const { invalidateSpy, wrapper } = setup();
    const { result } = await renderHook(() => useCreateTransfer(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(input);
    });

    expect(api.createTransfer).toHaveBeenCalledWith(input);
    for (const key of [['transacoes'], ['accounts'], ['contas'], ['dashboard']]) {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: key });
    }
  });
});
