import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import * as api from '../../src/api/transacoes';
import { transacoesSnapshot } from '../../src/mocks/transacoesSnapshot';
import {
  useCashflowSummary,
  useCategories,
  useFutureDebts,
  useRecurrences,
  useTransactionsInfinite,
  useTransactionsPage,
} from '../../src/hooks/useTransacoesQueries';
import type { TransactionFilters, TransactionPage } from '../../src/types/transacoes';

jest.mock('../../src/api/transacoes');

const filters: TransactionFilters = {
  period: '30d',
  categoryIds: [],
  query: '',
  from: '',
  to: '',
};
const samplePage = (): TransactionPage => ({
  items: transacoesSnapshot.transactions,
  page: 1,
  pageSize: 10,
  total: transacoesSnapshot.transactions.length,
  pageCount: 1,
});

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
    jest.mocked(api.getTransactionsPage).mockResolvedValue(samplePage());
    jest.mocked(api.getCategories).mockResolvedValue([]);
    jest.mocked(api.getRecurrences).mockResolvedValue(transacoesSnapshot.recurrences);
    jest.mocked(api.getFutureDebts).mockResolvedValue(transacoesSnapshot.debts);
  });

  it('useTransactionsPage entrega a página do log', async () => {
    const { result } = await renderHook(() => useTransactionsPage(filters, 1), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items[0]?.title).toBe('iFood - "Só hoje"');
  });

  it('useTransactionsInfinite acumula páginas', async () => {
    const { result } = await renderHook(() => useTransactionsInfinite(filters), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0]?.items[0]?.title).toBe('iFood - "Só hoje"');
  });

  it('useCategories entrega as categorias', async () => {
    jest
      .mocked(api.getCategories)
      .mockResolvedValue([{ id: 'c1', name: 'Alimentação', icon: 'restaurant', kind: 'expense' }]);
    const { result } = await renderHook(() => useCategories(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0]?.name).toBe('Alimentação');
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
