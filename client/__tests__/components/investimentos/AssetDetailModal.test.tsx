import { screen, userEvent, waitFor } from '@testing-library/react-native';
import * as api from '../../../src/api/investimentos';
import { AssetDetailModal } from '../../../src/components/investimentos/AssetDetailModal';
import { renderWithClient } from '../../_support/renderWithClient';
import type { AssetDetail } from '../../../src/types/investimentos';

jest.mock('../../../src/api/investimentos');

beforeEach(() => jest.clearAllMocks());

const detail: AssetDetail = {
  id: 'a1',
  ticker: 'WEGE3',
  name: 'WEG ON',
  assetClass: 'acoes',
  icon: 'corporate_fare',
  currentPriceCents: 5200,
  netQuantity: '10.00000000',
  avgPriceCents: 5000,
  costBasisCents: 50000,
  currentValueCents: 52000,
  gainCents: 2000,
  gainPct: 4,
  realizedCents: 0,
  trades: [
    {
      id: 't1',
      side: 'buy',
      quantity: '10',
      unitPriceCents: 5000,
      tradedOn: '2026-06-01',
      accountId: 'acc-1',
    },
  ],
};

function setup() {
  jest.mocked(api.getAsset).mockResolvedValue(detail);
  jest.mocked(api.getPriceHistory).mockResolvedValue([]); // a seção de histórico é uma query à parte
  const onClose = jest.fn();
  const onTrade = jest.fn();
  const onEdit = jest.fn();
  return { onClose, onTrade, onEdit };
}

describe('AssetDetailModal', () => {
  it('mostra a posição e as operações do ativo', async () => {
    const { onClose, onTrade, onEdit } = setup();
    await renderWithClient(
      <AssetDetailModal assetId="a1" onClose={onClose} onTrade={onTrade} onEdit={onEdit} />,
    );

    expect(await screen.findByText('WEGE3')).toBeOnTheScreen();
    expect(screen.getByText('WEG ON')).toBeOnTheScreen();
    expect(screen.getByText('10.00000000')).toBeOnTheScreen();
    expect(screen.getByText('Compra')).toBeOnTheScreen();
  });

  it('"Comprar mais" e "Vender" sinalizam o lado + ticker pro parent', async () => {
    const { onClose, onTrade, onEdit } = setup();
    await renderWithClient(
      <AssetDetailModal assetId="a1" onClose={onClose} onTrade={onTrade} onEdit={onEdit} />,
    );
    const user = userEvent.setup();

    await screen.findByText('WEGE3');
    await user.press(screen.getByRole('button', { name: 'Comprar mais' }));
    expect(onTrade).toHaveBeenCalledWith('buy', 'WEGE3');

    await user.press(screen.getByRole('button', { name: 'Vender' }));
    expect(onTrade).toHaveBeenCalledWith('sell', 'WEGE3');
  });

  it('"Editar ativo" sinaliza pro parent', async () => {
    const { onClose, onTrade, onEdit } = setup();
    await renderWithClient(
      <AssetDetailModal assetId="a1" onClose={onClose} onTrade={onTrade} onEdit={onEdit} />,
    );
    const user = userEvent.setup();

    await screen.findByText('WEGE3');
    await user.press(screen.getByRole('button', { name: 'Editar ativo' }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('lista vazia mostra "Sem operações ainda."', async () => {
    jest.mocked(api.getAsset).mockResolvedValue({ ...detail, trades: [] });
    await renderWithClient(
      <AssetDetailModal assetId="a1" onClose={jest.fn()} onTrade={jest.fn()} onEdit={jest.fn()} />,
    );

    await screen.findByText('WEGE3');
    expect(screen.getByText('Sem operações ainda.')).toBeOnTheScreen();
    expect(screen.queryByText('Compra')).toBeNull();
  });

  it('exclui uma operação (reverte o caixa via cascade)', async () => {
    const { onClose, onTrade, onEdit } = setup();
    jest.mocked(api.deleteTrade).mockResolvedValue(undefined);
    await renderWithClient(
      <AssetDetailModal assetId="a1" onClose={onClose} onTrade={onTrade} onEdit={onEdit} />,
    );
    const user = userEvent.setup();

    await screen.findByText('WEGE3');
    await user.press(screen.getByRole('button', { name: 'Excluir operação' }));

    await waitFor(() => expect(api.deleteTrade).toHaveBeenCalledWith('a1', 't1'));
  });
});
