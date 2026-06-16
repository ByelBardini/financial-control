import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import * as api from '../../src/api/transacoes';
import {
  useCreateInstallmentPurchase,
  useCreateRecurringRule,
  useCreateTransaction,
  useDeleteTransaction,
  useTransaction,
  useUpdateTransaction,
} from '../../src/hooks/useTransactionMutations';
import type { CreateTransactionInput } from '../../src/types/transacoes';

jest.mock('../../src/api/transacoes');

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

const input: CreateTransactionInput = {
  accountId: 'a1',
  categoryId: 'c1',
  description: 'Mercado',
  direction: 'outflow',
  amountCents: 5000,
  occurredOn: '2026-06-12',
};

// Saldo é derivado → criar/editar/excluir reflete em Transações, Contas e Dashboard.
function expectInvalidatedAll(spy: jest.SpyInstance) {
  for (const key of [['transacoes'], ['accounts'], ['contas'], ['dashboard']]) {
    expect(spy).toHaveBeenCalledWith({ queryKey: key });
  }
}

describe('useCreateTransaction', () => {
  it('cria e invalida transacoes/accounts/contas/dashboard', async () => {
    jest.mocked(api.createTransaction).mockResolvedValue({ id: 't1' } as never);
    const { invalidateSpy, wrapper } = setup();
    const { result } = await renderHook(() => useCreateTransaction(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(input);
    });

    expect(api.createTransaction).toHaveBeenCalledWith(input);
    expectInvalidatedAll(invalidateSpy);
  });
});

describe('useCreateInstallmentPurchase', () => {
  it('cria a compra parcelada e invalida', async () => {
    jest.mocked(api.createInstallmentPurchase).mockResolvedValue({ created: 3 } as never);
    const { invalidateSpy, wrapper } = setup();
    const { result } = await renderHook(() => useCreateInstallmentPurchase(), { wrapper });

    const installment = {
      accountId: 'a1',
      categoryId: 'c1',
      description: 'Notebook',
      amountCents: 30000,
      totalInstallments: 3,
      occurredOn: '2026-06-12',
    };
    await act(async () => {
      await result.current.mutateAsync(installment);
    });

    expect(api.createInstallmentPurchase).toHaveBeenCalledWith(installment);
    expectInvalidatedAll(invalidateSpy);
  });
});

describe('useCreateRecurringRule', () => {
  it('cria a recorrência e invalida', async () => {
    jest.mocked(api.createRecurringRule).mockResolvedValue({ created: true } as never);
    const { invalidateSpy, wrapper } = setup();
    const { result } = await renderHook(() => useCreateRecurringRule(), { wrapper });

    const rule = {
      accountId: 'a1',
      categoryId: 'c1',
      description: 'Salário',
      direction: 'inflow' as const,
      amountCents: 320000,
      frequency: 'monthly' as const,
      intervalCount: 1,
      startDate: '2026-06-01',
      endDate: null,
      maxOccurrences: null,
    };
    await act(async () => {
      await result.current.mutateAsync(rule);
    });

    expect(api.createRecurringRule).toHaveBeenCalledWith(rule);
    expectInvalidatedAll(invalidateSpy);
  });
});

describe('useUpdateTransaction', () => {
  it('edita e invalida', async () => {
    jest.mocked(api.updateTransaction).mockResolvedValue({ id: 't1' } as never);
    const { invalidateSpy, wrapper } = setup();
    const { result } = await renderHook(() => useUpdateTransaction(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        id: 't1',
        input: {
          categoryId: null,
          description: 'Editado',
          direction: 'outflow',
          amountCents: 7000,
          occurredOn: '2026-06-12',
        },
      });
    });

    expect(api.updateTransaction).toHaveBeenCalledWith(
      't1',
      expect.objectContaining({ amountCents: 7000 }),
    );
    expectInvalidatedAll(invalidateSpy);
  });
});

describe('useDeleteTransaction', () => {
  it('exclui e invalida', async () => {
    jest.mocked(api.deleteTransaction).mockResolvedValue(undefined);
    const { invalidateSpy, wrapper } = setup();
    const { result } = await renderHook(() => useDeleteTransaction(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('t1');
    });

    expect(api.deleteTransaction).toHaveBeenCalledWith('t1');
    expectInvalidatedAll(invalidateSpy);
  });
});

describe('useTransaction', () => {
  it('não busca quando não há id', async () => {
    const { wrapper } = setup();
    const { result } = await renderHook(() => useTransaction(undefined), { wrapper });
    expect(api.getTransaction).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('busca o detalhe quando há id', async () => {
    jest.mocked(api.getTransaction).mockResolvedValue({ id: 't9' } as never);
    const { wrapper } = setup();
    const { result } = await renderHook(() => useTransaction('t9'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.getTransaction).toHaveBeenCalledWith('t9');
  });
});
