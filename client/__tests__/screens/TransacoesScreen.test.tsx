import { screen, userEvent } from '@testing-library/react-native';
import { TransacoesScreen } from '../../src/screens/TransacoesScreen';
import { useIsDesktop } from '../../src/hooks/useIsDesktop';
import { mockTransacoesApi, renderWithClient } from '../_support/renderWithClient';

jest.mock('../../src/hooks/useIsDesktop');
jest.mock('../../src/api/transacoes');
const mockUseIsDesktop = useIsDesktop as jest.MockedFunction<typeof useIsDesktop>;

beforeEach(() => {
  jest.clearAllMocks();
  mockTransacoesApi();
});

describe('TransacoesScreen (responsivo)', () => {
  it('renderiza o layout mobile em telas estreitas', async () => {
    mockUseIsDesktop.mockReturnValue(false);
    await renderWithClient(<TransacoesScreen />);

    expect(await screen.findByText('Previsão de Colapso')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Transações' })).toBeSelected(); // BottomNav
  });

  it('renderiza o layout desktop em telas largas', async () => {
    mockUseIsDesktop.mockReturnValue(true);
    await renderWithClient(<TransacoesScreen />);

    expect(await screen.findByText('FLUXO DE CAIXA OPERACIONAL')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Transações' })).toBeOnTheScreen();
  });

  it('oculta e revela valores ao tocar no switch', async () => {
    mockUseIsDesktop.mockReturnValue(false);
    await renderWithClient(<TransacoesScreen />);
    await screen.findByText('iFood - "Só hoje"'); // espera as queries assentarem

    await userEvent.setup().press(screen.getByRole('switch', { name: 'Ocultar valores' }));
    expect(screen.getAllByLabelText('valor oculto').length).toBeGreaterThan(0);
  });
});
