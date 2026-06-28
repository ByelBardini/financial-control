import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import * as api from '../../src/api/investimentos';
import { useAssetSearch } from '../../src/hooks/useAssetSearch';

jest.mock('../../src/api/investimentos');

// QueryClient novo por teste: retry off + gcTime 0 (senão o timer de GC trava o jest).
const makeWrapper = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return Wrapper;
};

beforeEach(() => jest.clearAllMocks());

describe('useAssetSearch', () => {
  it('não busca quando o termo tem menos de 2 caracteres', async () => {
    const { result } = await renderHook(() => useAssetSearch('acoes', 'p'), {
      wrapper: makeWrapper(),
    });
    expect(result.current.enabled).toBe(false);
    expect(api.getAssetCatalog).not.toHaveBeenCalled();
  });

  it('não busca para renda_fixa (sem catálogo externo)', async () => {
    const { result } = await renderHook(() => useAssetSearch('renda_fixa', 'tesouro'), {
      wrapper: makeWrapper(),
    });
    expect(result.current.enabled).toBe(false);
    expect(api.getAssetCatalog).not.toHaveBeenCalled();
  });

  it('busca e entrega os itens quando habilitado (classe cotável + termo >= 2)', async () => {
    jest
      .mocked(api.getAssetCatalog)
      .mockResolvedValue([
        { ticker: 'PETR4', name: 'Petrobras PN', priceCents: 3806, logoUrl: 'u' },
      ]);

    const { result } = await renderHook(() => useAssetSearch('acoes', 'PETR'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.items.length).toBe(1));

    expect(api.getAssetCatalog).toHaveBeenCalledWith('acoes', 'PETR');
    expect(result.current.items[0]?.ticker).toBe('PETR4');
  });

  it('ignora espaços nas pontas do termo (trim antes de buscar)', async () => {
    jest.mocked(api.getAssetCatalog).mockResolvedValue([]);

    await renderHook(() => useAssetSearch('cripto', '  bitcoin  '), { wrapper: makeWrapper() });
    await waitFor(() => expect(api.getAssetCatalog).toHaveBeenCalledWith('cripto', 'bitcoin'));
  });
});
