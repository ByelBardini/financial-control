import { screen, userEvent, waitFor } from '@testing-library/react-native';
import * as api from '../../../src/api/investimentos';
import * as dashApi from '../../../src/api/dashboard';
import { TradeModal } from '../../../src/components/investimentos/TradeModal';
import { renderWithClient } from '../../_support/renderWithClient';
import type { Account } from '../../../src/types/dashboard';
import type { AssetDetail } from '../../../src/types/investimentos';

jest.mock('../../../src/api/investimentos');
jest.mock('../../../src/api/dashboard');

beforeEach(() => jest.clearAllMocks());

const accounts: Account[] = [
  { id: 'acc-1', name: 'Nubank', balanceCents: 100000, icon: 'account_balance', tone: 'neutral', dotColor: '#d0bcff' },
  { id: 'acc-2', name: 'Binance', balanceCents: 145000, icon: 'currency_bitcoin', tone: 'neutral', dotColor: '#f3ba2f' },
];

const baseAsset: AssetDetail = {
  id: 'a1',
  ticker: 'WEGE3',
  name: 'WEG ON',
  assetClass: 'acoes',
  icon: 'corporate_fare',
  currentPriceCents: 5000,
  netQuantity: '0.00000000',
  avgPriceCents: 0,
  costBasisCents: 0,
  currentValueCents: 0,
  gainCents: 0,
  gainPct: 0,
  realizedCents: 0,
  trades: [],
};

describe('TradeModal — ação (modo quantidade)', () => {
  it('usa o preço atual do ativo e liquida na conta pré-selecionada', async () => {
    jest.mocked(api.getAsset).mockResolvedValue(baseAsset);
    jest.mocked(dashApi.getAccounts).mockResolvedValue(accounts);
    jest.mocked(api.createTrade).mockResolvedValue({} as never);
    const onClose = jest.fn();
    await renderWithClient(<TradeModal assetId="a1" ticker="WEGE3" side="buy" onClose={onClose} />);
    const user = userEvent.setup();

    await screen.findByLabelText('Quantidade'); // espera asset + contas (sem toggle de modo)
    expect(screen.queryByRole('button', { name: 'Por valor' })).toBeNull();
    await user.type(screen.getByLabelText('Quantidade'), '10'); // não digita preço

    await user.press(screen.getByRole('button', { name: 'Comprar WEGE3' }));
    expect(api.createTrade).toHaveBeenCalledWith(
      'a1',
      expect.objectContaining({
        side: 'buy',
        quantity: '10',
        unitPriceCents: 5000, // veio do ativo
        accountId: 'acc-1',
      }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});

describe('TradeModal — cripto (modo valor)', () => {
  it('abre em "Por valor", deriva a quantidade do valor e submete na conta escolhida', async () => {
    jest.mocked(api.getAsset).mockResolvedValue({
      ...baseAsset,
      ticker: 'BTC',
      name: 'Bitcoin',
      assetClass: 'cripto',
      icon: 'currency_bitcoin',
      currentPriceCents: 30000000, // R$ 300.000,00
    });
    jest.mocked(dashApi.getAccounts).mockResolvedValue(accounts);
    jest.mocked(api.createTrade).mockResolvedValue({} as never);
    const onClose = jest.fn();
    await renderWithClient(<TradeModal assetId="a1" ticker="BTC" side="buy" onClose={onClose} />);
    const user = userEvent.setup();

    await screen.findByLabelText('Valor a investir'); // cripto abre em valor
    await user.type(screen.getByLabelText('Valor a investir'), '10000'); // R$100,00 → 0.00033333 BTC
    await user.press(screen.getByLabelText('Conta de origem: Nubank'));
    await user.press(screen.getByRole('menuitem', { name: 'Binance' }));
    await user.press(screen.getByRole('button', { name: 'Comprar BTC' }));

    expect(api.createTrade).toHaveBeenCalledWith(
      'a1',
      expect.objectContaining({
        side: 'buy',
        quantity: '0.00033333', // DERIVADA do valor
        unitPriceCents: 30000000,
        accountId: 'acc-2',
      }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});

describe('TradeModal — gate de carregamento', () => {
  it('mostra erro + "Tentar de novo" quando o ativo falha ao carregar', async () => {
    jest.mocked(api.getAsset).mockRejectedValue(new Error('boom'));
    jest.mocked(dashApi.getAccounts).mockResolvedValue(accounts);
    await renderWithClient(<TradeModal assetId="a1" ticker="WEGE3" side="buy" onClose={jest.fn()} />);

    expect(await screen.findByText('Não foi possível carregar a operação.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeOnTheScreen();
  });
});
