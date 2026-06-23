import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import * as api from '../../src/api/investimentos';
import {
  useArchiveAsset,
  useAsset,
  useCreateAsset,
  useCreateTrade,
  useDeleteTrade,
  useUpdateAsset,
} from '../../src/hooks/useInvestmentMutations';
import type { CreateTradeInput } from '../../src/types/investimentos';

jest.mock('../../src/api/investimentos');

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

// Operar mexe na carteira E no caixa (saldo derivado + extrato) → invalida as 4 telas + investimentos.
function expectInvalidatedAll(spy: jest.SpyInstance) {
  for (const key of [['investimentos'], ['accounts'], ['contas'], ['transacoes'], ['dashboard']]) {
    expect(spy).toHaveBeenCalledWith({ queryKey: key });
  }
}

describe('useCreateAsset', () => {
  it('cria o ativo e invalida investimentos/accounts/contas/transacoes/dashboard', async () => {
    jest.mocked(api.createAsset).mockResolvedValue({ id: 'a1' } as never);
    const { invalidateSpy, wrapper } = setup();
    const { result } = await renderHook(() => useCreateAsset(), { wrapper });

    const input = {
      ticker: 'WEGE3',
      name: 'WEG ON',
      assetClass: 'acoes' as const,
      icon: 'corporate_fare' as const,
      currentPriceCents: 5000,
    };
    await act(async () => {
      await result.current.mutateAsync(input);
    });

    expect(api.createAsset).toHaveBeenCalledWith(input);
    expectInvalidatedAll(invalidateSpy);
  });
});

describe('useUpdateAsset', () => {
  it('edita o ativo (id + corpo) e invalida', async () => {
    jest.mocked(api.updateAsset).mockResolvedValue({ id: 'a1' } as never);
    const { invalidateSpy, wrapper } = setup();
    const { result } = await renderHook(() => useUpdateAsset(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        id: 'a1',
        input: { ticker: 'WEGE3', name: 'WEG ON', icon: 'corporate_fare', currentPriceCents: 5200 },
      });
    });

    expect(api.updateAsset).toHaveBeenCalledWith(
      'a1',
      expect.objectContaining({ currentPriceCents: 5200 }),
    );
    expectInvalidatedAll(invalidateSpy);
  });
});

describe('useArchiveAsset', () => {
  it('arquiva (por id) e invalida', async () => {
    jest.mocked(api.archiveAsset).mockResolvedValue(undefined);
    const { invalidateSpy, wrapper } = setup();
    const { result } = await renderHook(() => useArchiveAsset(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('a1');
    });

    expect(api.archiveAsset).toHaveBeenCalledWith('a1');
    expectInvalidatedAll(invalidateSpy);
  });
});

describe('useCreateTrade', () => {
  it('compra/vende (assetId + corpo) e invalida as telas afetadas pelo caixa', async () => {
    jest.mocked(api.createTrade).mockResolvedValue({ id: 'a1' } as never);
    const { invalidateSpy, wrapper } = setup();
    const { result } = await renderHook(() => useCreateTrade(), { wrapper });

    const input: CreateTradeInput = {
      side: 'sell',
      quantity: '5',
      unitPriceCents: 1300,
      tradedOn: '2026-06-19',
      accountId: 'acc-1',
    };
    await act(async () => {
      await result.current.mutateAsync({ assetId: 'a1', input });
    });

    expect(api.createTrade).toHaveBeenCalledWith('a1', input);
    expectInvalidatedAll(invalidateSpy);
  });
});

describe('useDeleteTrade', () => {
  it('exclui a operação (assetId + tradeId) e invalida (cascade reverte o caixa)', async () => {
    jest.mocked(api.deleteTrade).mockResolvedValue(undefined);
    const { invalidateSpy, wrapper } = setup();
    const { result } = await renderHook(() => useDeleteTrade(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ assetId: 'a1', tradeId: 't9' });
    });

    expect(api.deleteTrade).toHaveBeenCalledWith('a1', 't9');
    expectInvalidatedAll(invalidateSpy);
  });
});

describe('useAsset', () => {
  it('não busca quando não há id', async () => {
    const { wrapper } = setup();
    const { result } = await renderHook(() => useAsset(undefined), { wrapper });
    expect(api.getAsset).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('busca o detalhe quando há id', async () => {
    jest.mocked(api.getAsset).mockResolvedValue({ id: 'a1' } as never);
    const { wrapper } = setup();
    const { result } = await renderHook(() => useAsset('a1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.getAsset).toHaveBeenCalledWith('a1');
  });
});
