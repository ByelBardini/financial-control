import { screen, userEvent } from '@testing-library/react-native';
import { DashboardScreen } from '../../src/screens/DashboardScreen';
import { useIsDesktop } from '../../src/hooks/useIsDesktop';
import {
  mockDashboardApi,
  mockPatrimonioApi,
  mockTransacoesApi,
  renderWithClient,
} from '../_support/renderWithClient';

jest.mock('../../src/hooks/useIsDesktop');
jest.mock('../../src/api/dashboard');
jest.mock('../../src/api/patrimonio');
jest.mock('../../src/api/transacoes');
const mockUseIsDesktop = useIsDesktop as jest.MockedFunction<typeof useIsDesktop>;

beforeEach(() => {
  jest.clearAllMocks();
  mockDashboardApi();
  mockPatrimonioApi();
  mockTransacoesApi();
});

describe('DashboardScreen (responsivo)', () => {
  it('renderiza o layout mobile em telas estreitas', async () => {
    mockUseIsDesktop.mockReturnValue(false);
    await renderWithClient(<DashboardScreen />);

    expect(screen.getByRole('button', { name: 'Início' })).toBeOnTheScreen();
    // O mobile agora também usa o cabeçalho padronizado (eyebrow + título).
    expect(screen.getByRole('header', { name: 'Bem-vindo de volta' })).toBeOnTheScreen();
  });

  it('renderiza o layout desktop em telas largas', async () => {
    mockUseIsDesktop.mockReturnValue(true);
    await renderWithClient(<DashboardScreen />);

    expect(screen.getByText('Visão Geral')).toBeOnTheScreen();
  });

  it('oculta e revela valores ao tocar no switch', async () => {
    mockUseIsDesktop.mockReturnValue(false);
    await renderWithClient(<DashboardScreen />);
    expect(await screen.findByText('R$ 1.284,50')).toBeOnTheScreen();

    await userEvent.setup().press(screen.getByRole('switch', { name: 'Ocultar valores' }));
    expect(screen.queryByText('R$ 1.284,50')).toBeNull();
    expect(screen.getAllByLabelText('valor oculto').length).toBeGreaterThan(0);
  });
});

describe('DashboardScreen — criar transação a partir da Início', () => {
  it('desktop: header → mini menu → Receita abre o modal "Nova receita"', async () => {
    mockUseIsDesktop.mockReturnValue(true);
    await renderWithClient(<DashboardScreen />);
    await screen.findByText('Visão Geral');
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Nova transação' }));
    await user.press(screen.getByRole('button', { name: 'Receita' }));

    expect(await screen.findByRole('header', { name: 'Nova receita' })).toBeOnTheScreen();
  });

  it('mobile: FAB → speed dial → Despesa abre o modal "Nova despesa"', async () => {
    mockUseIsDesktop.mockReturnValue(false);
    await renderWithClient(<DashboardScreen />);
    await screen.findByText('Saldo líquido');
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Nova transação' }));
    await user.press(screen.getByRole('button', { name: 'Despesa' }));

    expect(await screen.findByRole('header', { name: 'Nova despesa' })).toBeOnTheScreen();
  });
});
