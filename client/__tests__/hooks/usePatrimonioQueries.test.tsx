import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import * as api from '../../src/api/patrimonio';
import { usePatrimonioOverview } from '../../src/hooks/usePatrimonioQueries';
import type { PatrimonioOverview } from '../../src/types/patrimonio';

jest.mock('../../src/api/patrimonio');

const overview: PatrimonioOverview = {
  liquidBalanceCents: 343000,
  bankCents: 300000,
  cashCents: 43000,
  investedCents: 1400000,
  cryptoCents: 100000,
  cardDebtCents: 32000,
  voucherCents: 21500,
};

// QueryClient novo por teste: retry off + gcTime 0 (senão o timer de GC trava o jest).
const makeWrapper = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return Wrapper;
};

describe('usePatrimonioOverview (React Query)', () => {
  it('entrega o overview em caso de sucesso', async () => {
    jest.mocked(api.getPatrimonioOverview).mockResolvedValue(overview);

    const { result } = await renderHook(() => usePatrimonioOverview(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.liquidBalanceCents).toBe(343000);
  });

  it('expõe estado de erro quando a API falha', async () => {
    jest.mocked(api.getPatrimonioOverview).mockRejectedValue(new Error('boom'));

    const { result } = await renderHook(() => usePatrimonioOverview(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
