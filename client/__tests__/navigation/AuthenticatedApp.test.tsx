import { screen, userEvent } from '@testing-library/react-native';
import { AuthenticatedApp } from '../../src/navigation/AuthenticatedApp';
import { useIsDesktop } from '../../src/hooks/useIsDesktop';
import {
  mockContasApi,
  mockDashboardApi,
  mockTransacoesApi,
  renderWithClient,
} from '../_support/renderWithClient';

jest.mock('../../src/hooks/useIsDesktop');
jest.mock('../../src/api/dashboard');
jest.mock('../../src/api/contas');
jest.mock('../../src/api/transacoes');
const mockUseIsDesktop = useIsDesktop as jest.MockedFunction<typeof useIsDesktop>;

beforeEach(() => {
  jest.clearAllMocks();
  mockDashboardApi();
  mockContasApi();
  mockTransacoesApi();
  mockUseIsDesktop.mockReturnValue(false); // fixa o mobile pra exercitar o BottomNav
});

describe('AuthenticatedApp (navegação Dashboard↔Transações↔Contas)', () => {
  it('começa no Dashboard, navega pra Contas e volta', async () => {
    await renderWithClient(<AuthenticatedApp />);

    expect(await screen.findByText('Saldo do Mês')).toBeOnTheScreen(); // Dashboard

    await userEvent.setup().press(screen.getByRole('button', { name: 'Contas' }));
    expect(await screen.findByText('Tempo Estimado de Vida (Bancária)')).toBeOnTheScreen(); // Contas
    expect(screen.queryByText('Saldo do Mês')).toBeNull();

    await userEvent.setup().press(screen.getByRole('button', { name: 'Início' }));
    expect(await screen.findByText('Saldo do Mês')).toBeOnTheScreen(); // de volta ao Dashboard
  });

  it('navega do Dashboard para Transações', async () => {
    await renderWithClient(<AuthenticatedApp />);
    await screen.findByText('Saldo do Mês');

    await userEvent.setup().press(screen.getByRole('button', { name: 'Transações' }));

    expect(await screen.findByText('Previsão de Colapso')).toBeOnTheScreen(); // Transações
    expect(screen.queryByText('Saldo do Mês')).toBeNull();
  });
});
