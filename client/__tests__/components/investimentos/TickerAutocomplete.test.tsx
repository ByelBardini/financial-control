import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import * as api from '../../../src/api/investimentos';
import { TickerAutocomplete } from '../../../src/components/investimentos/TickerAutocomplete';
import type { AssetClass, CatalogoItem } from '../../../src/types/investimentos';

jest.mock('../../../src/api/investimentos');

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(api.getAssetCatalog).mockResolvedValue([]);
});

const makeWrapper = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return Wrapper;
};

// Harness com estado: o input é controlado, então o teste reflete o onChange no value.
function Harness({
  assetClass = 'acoes',
  onPick = jest.fn(),
}: {
  assetClass?: AssetClass;
  onPick?: (item: CatalogoItem) => void;
}) {
  const [v, setV] = useState('');
  return (
    <TickerAutocomplete value={v} onChangeText={setV} onPick={onPick} assetClass={assetClass} />
  );
}

describe('TickerAutocomplete', () => {
  it('digita, mostra as sugestões e escolher chama onPick com o item', async () => {
    jest
      .mocked(api.getAssetCatalog)
      .mockResolvedValue([{ ticker: 'PETR4', name: 'Petrobras PN', priceCents: 3806, logoUrl: 'u' }]);
    const onPick = jest.fn();
    await render(<Harness onPick={onPick} />, { wrapper: makeWrapper() });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Ticker'), 'PETR');
    await user.press(await screen.findByRole('button', { name: 'PETR4 Petrobras PN' }));

    expect(onPick).toHaveBeenCalledWith(
      expect.objectContaining({ ticker: 'PETR4', name: 'Petrobras PN', priceCents: 3806 }),
    );
  });

  it('mostra "Buscando…" enquanto a busca está pendente, depois os resultados', async () => {
    let resolve!: (items: CatalogoItem[]) => void;
    jest
      .mocked(api.getAssetCatalog)
      .mockReturnValue(new Promise<CatalogoItem[]>((r) => (resolve = r)));
    await render(<Harness />, { wrapper: makeWrapper() });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Ticker'), 'PETR');
    expect(await screen.findByText(/Buscando/)).toBeOnTheScreen();

    resolve([{ ticker: 'PETR4', name: 'Petrobras PN', priceCents: 3806 }]);
    expect(await screen.findByRole('button', { name: 'PETR4 Petrobras PN' })).toBeOnTheScreen();
  });

  it('mostra estado vazio quando não há sugestões', async () => {
    await render(<Harness />, { wrapper: makeWrapper() });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Ticker'), 'ZZZZ');
    expect(await screen.findByText(/Nenhum ativo encontrado/)).toBeOnTheScreen();
  });

  it('mostra fallback de erro quando a busca falha (texto livre segue valendo)', async () => {
    jest.mocked(api.getAssetCatalog).mockRejectedValue(new Error('rede'));
    await render(<Harness />, { wrapper: makeWrapper() });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Ticker'), 'PETR');
    expect(await screen.findByText(/pode digitar o ticker manualmente/)).toBeOnTheScreen();
  });

  it('renda_fixa não busca no catálogo nem abre dropdown', async () => {
    await render(<Harness assetClass="renda_fixa" />, { wrapper: makeWrapper() });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Ticker'), 'tesouro');
    expect(api.getAssetCatalog).not.toHaveBeenCalled();
  });
});
