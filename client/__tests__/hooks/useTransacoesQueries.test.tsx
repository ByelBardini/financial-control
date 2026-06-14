import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import * as api from '../../src/api/transacoes';
import { transacoesSnapshot } from '../../src/mocks/transacoesSnapshot';
import {
  useCashflowSummary,
  useFutureDebts,
  useRecurrences,
  useTransactions,
} from '../../src/hooks/useTransacoesQueries';

jest.mock('../../src/api/transacoes');

// QueryClient novo por teste: retry off + gcTime 0 (senão o timer de GC trava o jest).
const makeWrapper = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return Wrapper;
};

describe('useCashflowSummary (React Query)', () => {
  it('entrega o resumo em caso de sucesso', async () => {
    jest.mocked(api.getCashflowSummary).mockResolvedValue(transacoesSnapshot.summary);

    const { result } = await renderHook(() => useCashflowSummary(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.collapse.levelLabel).toBe('8 Dias');
  });

  it('expõe estado de erro quando a API falha', async () => {
    jest.mocked(api.getCashflowSummary).mockRejectedValue(new Error('boom'));

    const { result } = await renderHook(() => useCashflowSummary(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('demais recursos de Transações', () => {
  beforeEach(() => {
    jest.mocked(api.getTransactions).mockResolvedValue(transacoesSnapshot.transactions);
    jest.mocked(api.getRecurrences).mockResolvedValue(transacoesSnapshot.recurrences);
    jest.mocked(api.getFutureDebts).mockResolvedValue(transacoesSnapshot.debts);
  });

  it('useTransactions entrega o log de transações', async () => {
    const { result } = await renderHook(() => useTransactions(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0]?.title).toBe('iFood - "Só hoje"');
  });

  it('useRecurrences entrega as recorrências', async () => {
    const { result } = await renderHook(() => useRecurrences(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0]?.name).toBe('Salário Base');
  });

  it('useFutureDebts entrega as dívidas futuras', async () => {
    const { result } = await renderHook(() => useFutureDebts(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0]?.label).toBe('iPhone 15 Pro');
  });
});
