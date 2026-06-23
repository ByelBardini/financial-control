import { screen, userEvent } from '@testing-library/react-native';
import { InvestimentosScreen } from '../../src/screens/InvestimentosScreen';
import { useIsDesktop } from '../../src/hooks/useIsDesktop';
import * as investimentosApi from '../../src/api/investimentos';
import * as dashApi from '../../src/api/dashboard';
import { mockInvestimentosApi, renderWithClient } from '../_support/renderWithClient';
import type { AssetDetail } from '../../src/types/investimentos';
import type { Account } from '../../src/types/dashboard';

jest.mock('../../src/hooks/useIsDesktop');
jest.mock('../../src/api/investimentos');
jest.mock('../../src/api/dashboard');
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

  it('detalhe → "Editar ativo" troca pro modal de edição', async () => {
    mockUseIsDesktop.mockReturnValue(false);
    jest.mocked(investimentosApi.getAsset).mockResolvedValue(petr4Detail);
    await renderWithClient(<InvestimentosScreen />);
    await screen.findByText('PETR4');
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Abrir PETR4' }));
    await screen.findByRole('header', { name: 'Detalhe do ativo' });
    await user.press(screen.getByRole('button', { name: 'Editar ativo' }));

    expect(await screen.findByRole('header', { name: 'Editar ativo' })).toBeOnTheScreen();
  });

  it('detalhe → "Comprar mais" troca pro modal de compra', async () => {
    mockUseIsDesktop.mockReturnValue(false);
    jest.mocked(investimentosApi.getAsset).mockResolvedValue(petr4Detail);
    const accounts: Account[] = [
      { id: 'acc-1', name: 'Nubank', balanceCents: 1000, icon: 'account_balance', tone: 'neutral', dotColor: '#d0bcff' },
    ];
    jest.mocked(dashApi.getAccounts).mockResolvedValue(accounts);
    await renderWithClient(<InvestimentosScreen />);
    await screen.findByText('PETR4');
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Abrir PETR4' }));
    await screen.findByRole('header', { name: 'Detalhe do ativo' });
    await user.press(screen.getByRole('button', { name: 'Comprar mais' }));

    expect(await screen.findByRole('header', { name: 'Comprar PETR4' })).toBeOnTheScreen();
  });
});
