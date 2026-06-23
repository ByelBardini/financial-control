import { screen, userEvent } from '@testing-library/react-native';
import { InvestimentosScreen } from '../../src/screens/InvestimentosScreen';
import { useIsDesktop } from '../../src/hooks/useIsDesktop';
import * as investimentosApi from '../../src/api/investimentos';
import { mockInvestimentosApi, renderWithClient } from '../_support/renderWithClient';
import type { AssetDetail } from '../../src/types/investimentos';

jest.mock('../../src/hooks/useIsDesktop');
jest.mock('../../src/api/investimentos');
const mockUseIsDesktop = useIsDesktop as jest.MockedFunction<typeof useIsDesktop>;

const petr4Detail: AssetDetail = {
  id: 'petr4',
  ticker: 'PETR4',
  name: 'Petrobras PN',
  assetClass: 'acoes',
  icon: 'local_gas_station',
  currentPriceCents: 4500,
  netQuantity: '10.00000000',
  avgPriceCents: 5000,
  costBasisCents: 50000,
  currentValueCents: 45000,
  gainCents: -5000,
  gainPct: -10,
  realizedCents: 0,
  trades: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockInvestimentosApi();
});

describe('InvestimentosScreen (responsivo)', () => {
  it('renderiza o layout mobile em telas estreitas', async () => {
    mockUseIsDesktop.mockReturnValue(false);
    await renderWithClient(<InvestimentosScreen />);

    expect(await screen.findByRole('header', { name: 'Portfólio de Ilusões' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Investimentos' })).toBeSelected(); // BottomNav
  });

  it('renderiza o layout desktop em telas largas', async () => {
    mockUseIsDesktop.mockReturnValue(true);
    await renderWithClient(<InvestimentosScreen />);

    expect(await screen.findByRole('header', { name: 'Registro de Quedas' })).toBeOnTheScreen();
    expect(
      await screen.findByRole('header', { name: 'O Circo da Volatilidade' }),
    ).toBeOnTheScreen();
  });

  it('oculta e revela valores ao tocar no switch', async () => {
    mockUseIsDesktop.mockReturnValue(false);
    await renderWithClient(<InvestimentosScreen />);
    await screen.findByText('PETR4'); // espera as queries assentarem

    await userEvent.setup().press(screen.getByRole('switch', { name: 'Ocultar valores' }));
    expect(screen.getAllByLabelText('valor oculto').length).toBeGreaterThan(0);
  });

  it('o FAB "Novo ativo" abre o modal de cadastro', async () => {
    mockUseIsDesktop.mockReturnValue(false);
    await renderWithClient(<InvestimentosScreen />);
    await screen.findByText('PETR4');

    await userEvent.setup().press(screen.getByRole('button', { name: 'Novo ativo' }));
    expect(await screen.findByRole('header', { name: 'Novo ativo' })).toBeOnTheScreen();
  });

  it('tocar numa posição abre o detalhe do ativo', async () => {
    mockUseIsDesktop.mockReturnValue(false);
    jest.mocked(investimentosApi.getAsset).mockResolvedValue(petr4Detail);
    await renderWithClient(<InvestimentosScreen />);
    await screen.findByText('PETR4');

    await userEvent.setup().press(screen.getByRole('button', { name: 'Abrir PETR4' }));
    expect(await screen.findByRole('header', { name: 'Detalhe do ativo' })).toBeOnTheScreen();
  });
});
