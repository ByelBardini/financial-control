import { screen, userEvent, waitFor } from '@testing-library/react-native';
import * as api from '../../../src/api/investimentos';
import * as dashApi from '../../../src/api/dashboard';
import { TradeModal } from '../../../src/components/investimentos/TradeModal';
import { renderWithClient } from '../../_support/renderWithClient';
import type { Account } from '../../../src/types/dashboard';

jest.mock('../../../src/api/investimentos');
jest.mock('../../../src/api/dashboard');

beforeEach(() => jest.clearAllMocks());

const accounts: Account[] = [
  { id: 'acc-1', name: 'Nubank', balanceCents: 100000, icon: 'account_balance', tone: 'neutral', dotColor: '#d0bcff' },
  { id: 'acc-2', name: 'Binance', balanceCents: 145000, icon: 'currency_bitcoin', tone: 'neutral', dotColor: '#f3ba2f' },
];

describe('TradeModal — comprar', () => {
  it('liquida a compra na conta pré-selecionada e fecha', async () => {
    jest.mocked(dashApi.getAccounts).mockResolvedValue(accounts);
    jest.mocked(api.createTrade).mockResolvedValue({} as never);
    const onClose = jest.fn();
    await renderWithClient(
      <TradeModal assetId="a1" ticker="WEGE3" side="buy" onClose={onClose} />,
    );
    const user = userEvent.setup();

    await screen.findByLabelText('Quantidade'); // espera o form (contas carregaram)
    expect(screen.getByRole('header', { name: 'Comprar WEGE3' })).toBeOnTheScreen();
    await user.type(screen.getByLabelText('Quantidade'), '10');
    await user.type(screen.getByLabelText('Preço unitário'), '1000');
    await user.press(screen.getByRole('button', { name: 'Comprar WEGE3' }));

    expect(api.createTrade).toHaveBeenCalledWith(
      'a1',
      expect.objectContaining({
        side: 'buy',
        quantity: '10',
        unitPriceCents: 1000,
        accountId: 'acc-1',
      }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});

describe('TradeModal — vender', () => {
  it('mostra "Conta de destino" e escolhe outra conta antes de vender', async () => {
    jest.mocked(dashApi.getAccounts).mockResolvedValue(accounts);
    jest.mocked(api.createTrade).mockResolvedValue({} as never);
    const onClose = jest.fn();
    await renderWithClient(
      <TradeModal assetId="a1" ticker="BTC" side="sell" onClose={onClose} />,
    );
    const user = userEvent.setup();

    await screen.findByLabelText('Quantidade');
    await user.type(screen.getByLabelText('Quantidade'), '0.5');
    await user.type(screen.getByLabelText('Preço unitário'), '15000000');
    await user.press(screen.getByLabelText('Conta de destino: Nubank'));
    await user.press(screen.getByRole('menuitem', { name: 'Binance' }));
    await user.press(screen.getByRole('button', { name: 'Vender BTC' }));

    expect(api.createTrade).toHaveBeenCalledWith(
      'a1',
      expect.objectContaining({ side: 'sell', quantity: '0.5', accountId: 'acc-2' }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});
