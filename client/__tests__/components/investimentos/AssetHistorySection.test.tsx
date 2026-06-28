import { screen, userEvent, waitFor } from '@testing-library/react-native';
import * as api from '../../../src/api/investimentos';
import { AssetHistorySection } from '../../../src/components/investimentos/AssetHistorySection';
import { renderWithClient } from '../../_support/renderWithClient';

jest.mock('../../../src/api/investimentos');

beforeEach(() => jest.clearAllMocks());

describe('AssetHistorySection', () => {
  it('mostra o cabeçalho + gráfico e busca o range default 6mo', async () => {
    jest.mocked(api.getPriceHistory).mockResolvedValue([
      { date: '2026-06-15', priceCents: 1200 },
      { date: '2026-06-16', priceCents: 1250 },
    ]);

    await renderWithClient(<AssetHistorySection assetId="a1" tone="secondary" />);

    expect(await screen.findByTestId('price-sparkline')).toBeOnTheScreen();
    expect(screen.getByText('Histórico de preço')).toBeOnTheScreen();
    expect(api.getPriceHistory).toHaveBeenCalledWith('a1', '6mo');
  });

  it('sem pontos mostra o estado vazio em vez do gráfico', async () => {
    jest.mocked(api.getPriceHistory).mockResolvedValue([]);

    await renderWithClient(<AssetHistorySection assetId="a1" tone="neutral" />);

    expect(await screen.findByText(/Sem histórico ainda/)).toBeOnTheScreen();
    expect(screen.queryByTestId('price-sparkline')).not.toBeOnTheScreen();
  });

  it('trocar o período pra 1A re-busca com o range 1y', async () => {
    jest.mocked(api.getPriceHistory).mockResolvedValue([{ date: '2026-06-15', priceCents: 1200 }]);
    const user = userEvent.setup();

    await renderWithClient(<AssetHistorySection assetId="a1" tone="secondary" />);
    await screen.findByTestId('price-sparkline');

    await user.press(screen.getByRole('button', { name: '1A' }));

    await waitFor(() => expect(api.getPriceHistory).toHaveBeenCalledWith('a1', '1y'));
  });
});
