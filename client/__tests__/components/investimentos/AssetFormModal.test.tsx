import { screen, userEvent, waitFor } from '@testing-library/react-native';
import * as api from '../../../src/api/investimentos';
import { ApiError } from '../../../src/api/client';
import { AssetFormModal } from '../../../src/components/investimentos/AssetFormModal';
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
  trades: [],
};

describe('AssetFormModal — criar', () => {
  it('cria o ativo e fecha', async () => {
    jest.mocked(api.createAsset).mockResolvedValue(detail);
    const onClose = jest.fn();
    await renderWithClient(<AssetFormModal mode="create" onClose={onClose} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Ticker'), 'WEGE3');
    await user.type(screen.getByLabelText('Nome'), 'WEG ON');
    await user.type(screen.getByLabelText('Preço atual'), '5200');
    await user.press(screen.getByRole('button', { name: 'Criar ativo' }));

    expect(api.createAsset).toHaveBeenCalledWith(
      expect.objectContaining({ ticker: 'WEGE3', name: 'WEG ON', assetClass: 'acoes' }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('mostra a mensagem do server e não fecha quando a mutation falha', async () => {
    jest.mocked(api.createAsset).mockRejectedValue(new ApiError('ticker já existe', 400));
    const onClose = jest.fn();
    await renderWithClient(<AssetFormModal mode="create" onClose={onClose} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Ticker'), 'WEGE3');
    await user.type(screen.getByLabelText('Nome'), 'WEG ON');
    await user.press(screen.getByRole('button', { name: 'Criar ativo' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('ticker já existe');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('fecha pelo backdrop', async () => {
    const onClose = jest.fn();
    await renderWithClient(<AssetFormModal mode="create" onClose={onClose} />);
    const user = userEvent.setup();

    await user.press(screen.getByLabelText('Fechar formulário'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('AssetFormModal — editar', () => {
  it('pré-preenche, salva e fecha', async () => {
    jest.mocked(api.getAsset).mockResolvedValue(detail);
    jest.mocked(api.updateAsset).mockResolvedValue(detail);
    const onClose = jest.fn();
    await renderWithClient(<AssetFormModal mode="edit" assetId="a1" onClose={onClose} />);
    const user = userEvent.setup();

    expect(await screen.findByDisplayValue('WEG ON')).toBeOnTheScreen();
    expect(screen.getByLabelText('Classe: Ações')).toBeDisabled();

    await user.press(screen.getByRole('button', { name: 'Salvar' }));

    expect(api.updateAsset).toHaveBeenCalledWith('a1', expect.objectContaining({ name: 'WEG ON' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('arquiva e fecha', async () => {
    jest.mocked(api.getAsset).mockResolvedValue(detail);
    jest.mocked(api.archiveAsset).mockResolvedValue(undefined);
    const onClose = jest.fn();
    await renderWithClient(<AssetFormModal mode="edit" assetId="a1" onClose={onClose} />);
    const user = userEvent.setup();

    await screen.findByDisplayValue('WEG ON');
    await user.press(screen.getByRole('button', { name: 'Arquivar ativo' }));
    await user.press(screen.getByRole('button', { name: 'Confirmar arquivamento' }));

    expect(api.archiveAsset).toHaveBeenCalledWith('a1');
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
