import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import * as api from '../../src/api/dashboard';
import { dashboardSnapshot } from '../../src/mocks/dashboardSnapshot';
import { useAccounts, useMonthBalance } from '../../src/hooks/useDashboardQueries';

jest.mock('../../src/api/dashboard');

// Wrapper com um QueryClient novo por teste: retry off (erro resolve rápido) e
// gcTime 0 pra não deixar timer de GC aberto (senão o jest não sai do processo).
const makeWrapper = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return Wrapper;
};

describe('useAccounts (React Query)', () => {
  it('entrega os dados em caso de sucesso', async () => {
    jest.mocked(api.getAccounts).mockResolvedValue([
      {
        id: 'nubank',
        name: 'Nubank',
        balanceCents: 84220,
        icon: 'credit_card',
        tone: 'primary',
        dotColor: '#d0bcff',
      },
    ]);

    const { result } = await renderHook(() => useAccounts(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]?.name).toBe('Nubank');
  });

  it('expõe estado de erro quando a API falha', async () => {
    jest.mocked(api.getAccounts).mockRejectedValue(new Error('boom'));

    const { result } = await renderHook(() => useAccounts(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useMonthBalance (month → API + chave de cache)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(api.getMonthBalance).mockResolvedValue(dashboardSnapshot.balance);
  });

  it('repassa o month informado pra função da API', async () => {
    const { result } = await renderHook(() => useMonthBalance('2026-05'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(api.getMonthBalance).toHaveBeenCalledWith('2026-05');
  });

  it('sem arg busca o mês corrente (month undefined)', async () => {
    const { result } = await renderHook(() => useMonthBalance(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(api.getMonthBalance).toHaveBeenCalledWith(undefined);
  });

  it('chaveia o cache por month: meses diferentes disparam buscas separadas', async () => {
    const { rerender } = await renderHook((m?: string) => useMonthBalance(m), {
      initialProps: '2026-05',
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(api.getMonthBalance).toHaveBeenCalledWith('2026-05'));

    await rerender('2026-06');
    await waitFor(() => expect(api.getMonthBalance).toHaveBeenCalledWith('2026-06'));

    expect(api.getMonthBalance).toHaveBeenCalledTimes(2);
  });
});
