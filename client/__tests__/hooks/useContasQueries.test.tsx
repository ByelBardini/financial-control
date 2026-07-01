import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import * as api from '../../src/api/contas';
import { contasSnapshot } from '../../src/mocks/contasSnapshot';
import {
  useBankAccounts,
  useCardDetail,
  useCashWallet,
  useCreditCards,
  useManagementTip,
  usePovertyXray,
  useVouchers,
} from '../../src/hooks/useContasQueries';

jest.mock('../../src/api/contas');

// QueryClient novo por teste: retry off + gcTime 0 (senão o timer de GC trava o jest).
const makeWrapper = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return Wrapper;
};

describe('useBankAccounts (React Query)', () => {
  it('entrega os bancos em caso de sucesso', async () => {
    jest.mocked(api.getBankAccounts).mockResolvedValue(contasSnapshot.banks);

    const { result } = await renderHook(() => useBankAccounts(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.[0]?.name).toBe('Nubank');
  });

  it('expõe estado de erro quando a API falha', async () => {
    jest.mocked(api.getBankAccounts).mockRejectedValue(new Error('boom'));

    const { result } = await renderHook(() => useBankAccounts(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('demais recursos de Contas', () => {
  beforeEach(() => {
    jest.mocked(api.getCreditCards).mockResolvedValue(contasSnapshot.cards);
    jest.mocked(api.getVouchers).mockResolvedValue(contasSnapshot.vouchers);
    jest.mocked(api.getCashWallet).mockResolvedValue(contasSnapshot.cash);
    jest.mocked(api.getPovertyXray).mockResolvedValue(contasSnapshot.xray);
    jest.mocked(api.getManagementTip).mockResolvedValue(contasSnapshot.tip);
  });

  it('useCreditCards entrega os cartões', async () => {
    const { result } = await renderHook(() => useCreditCards(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0]?.name).toBe('Nubank Roxinho');
  });

  it('useVouchers entrega os vales', async () => {
    const { result } = await renderHook(() => useVouchers(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0]?.name).toBe('Alelo Refeição');
  });

  it('useCashWallet entrega a carteira física', async () => {
    const { result } = await renderHook(() => useCashWallet(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.confidencePercent).toBe(4);
  });

  it('usePovertyXray entrega o raio-x com panic', async () => {
    const { result } = await renderHook(() => usePovertyXray(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.panic.percent).toBe(85);
  });

  it('useManagementTip entrega a dica', async () => {
    const { result } = await renderHook(() => useManagementTip(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.title).toBe('Dica de Gestão');
  });
});

describe('useCardDetail (só busca com id)', () => {
  it('não busca quando o id é undefined (overlay fechado)', async () => {
    const { result } = await renderHook(() => useCardDetail(undefined), { wrapper: makeWrapper() });
    expect(api.getCardDetail).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('busca o detalhe do cartão quando há id', async () => {
    jest
      .mocked(api.getCardDetail)
      .mockResolvedValue({ id: 'c1', name: 'Nubank', months: [] } as never);
    const { result } = await renderHook(() => useCardDetail('c1'), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.getCardDetail).toHaveBeenCalledWith('c1');
  });
});
