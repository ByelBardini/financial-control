import { render, screen, userEvent } from '@testing-library/react-native';
import { DashboardScreen } from '../../src/screens/DashboardScreen';
import { useIsDesktop } from '../../src/hooks/useIsDesktop';

jest.mock('../../src/hooks/useIsDesktop');
const mockUseIsDesktop = useIsDesktop as jest.MockedFunction<typeof useIsDesktop>;

describe('DashboardScreen (responsivo)', () => {
  it('renderiza o layout mobile em telas estreitas', async () => {
    mockUseIsDesktop.mockReturnValue(false);
    await render(<DashboardScreen />);

    expect(screen.getByRole('button', { name: 'Início' })).toBeOnTheScreen();
    expect(screen.queryByText('Visão Geral')).toBeNull();
  });

  it('renderiza o layout desktop em telas largas', async () => {
    mockUseIsDesktop.mockReturnValue(true);
    await render(<DashboardScreen />);

    expect(screen.getByText('Visão Geral')).toBeOnTheScreen();
    expect(screen.getByText('Gestão de Crise')).toBeOnTheScreen();
  });

  it('oculta e revela valores ao tocar no switch', async () => {
    mockUseIsDesktop.mockReturnValue(false);
    await render(<DashboardScreen />);
    expect(screen.getByText('R$ 1.284,50')).toBeOnTheScreen();

    await userEvent.setup().press(screen.getByRole('switch', { name: 'Ocultar valores' }));
    expect(screen.queryByText('R$ 1.284,50')).toBeNull();
    expect(screen.getAllByLabelText('valor oculto').length).toBeGreaterThan(0);
  });
});
