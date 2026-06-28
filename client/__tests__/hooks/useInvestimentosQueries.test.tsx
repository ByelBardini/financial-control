import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import * as api from '../../src/api/investimentos';
import { investimentosSnapshot } from '../../src/mocks/investimentosSnapshot';
import {
  useCryptoBlock,
  useInvestmentAllocation,
  useInvestmentPositions,
  useInvestmentRisk,
  useInvestmentSummary,
  usePortfolioEvolution,
} from '../../src/hooks/useInvestimentosQueries';

jest.mock('../../src/api/investimentos');

// QueryClient novo por teste: retry off + gcTime 0 (senão o timer de GC trava o jest).
const makeWrapper = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return Wrapper;
};

describe('useInvestmentSummary (React Query)', () => {
  it('entrega o resumo do portfólio em caso de sucesso', async () => {
    jest.mocked(api.getPortfolioSummary).mockResolvedValue(investimentosSnapshot.summary);

    const { result } = await renderHook(() => useInvestmentSummary(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.title).toBe('Portfólio de Ilusões');
  });

  it('expõe estado de erro quando a API falha', async () => {
    jest.mocked(api.getPortfolioSummary).mockRejectedValue(new Error('boom'));

    const { result } = await renderHook(() => useInvestmentSummary(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('demais seções de Investimentos', () => {
  beforeEach(() => {
    jest.mocked(api.getPositions).mockResolvedValue(investimentosSnapshot.positions);
    jest.mocked(api.getAllocation).mockResolvedValue(investimentosSnapshot.allocation);
    jest.mocked(api.getCryptoBlock).mockResolvedValue(investimentosSnapshot.crypto);
    jest.mocked(api.getRiskAssessment).mockResolvedValue(investimentosSnapshot.risk);
  });

  it('useInvestmentPositions entrega as posições', async () => {
    const { result } = await renderHook(() => useInvestmentPositions(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0]?.ticker).toBe('PETR4');
  });

  it('useInvestmentAllocation entrega a alocação por classe', async () => {
    const { result } = await renderHook(() => useInvestmentAllocation(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0]?.label).toBe('Ações');
  });

  it('useCryptoBlock entrega o bloco de cripto à parte', async () => {
    const { result } = await renderHook(() => useCryptoBlock(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.holdings[0]?.symbol).toBe('BTC');
  });

  it('useInvestmentRisk entrega a avaliação de risco', async () => {
    const { result } = await renderHook(() => useInvestmentRisk(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.level).toBe(investimentosSnapshot.risk.level);
  });

  it('usePortfolioEvolution entrega a série de evolução pelo range', async () => {
    jest
      .mocked(api.getPortfolioEvolution)
      .mockResolvedValue([
        { date: '2026-06-16', marketValueCents: 240000, costBasisCents: 220000 },
      ]);

    const { result } = await renderHook(() => usePortfolioEvolution('6mo'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(api.getPortfolioEvolution).toHaveBeenCalledWith('6mo');
    expect(result.current.data?.[0]?.marketValueCents).toBe(240000);
  });
});
