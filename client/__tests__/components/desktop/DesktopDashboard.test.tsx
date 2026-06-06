import { render, screen, userEvent } from '@testing-library/react-native';
import { DesktopDashboard } from '../../../src/components/desktop/DesktopDashboard';
import { dashboardSnapshot } from '../../../src/mocks/dashboardSnapshot';

describe('DesktopDashboard', () => {
  it('compõe sidebar, header e todos os painéis do grid', async () => {
    await render(
      <DesktopDashboard data={dashboardSnapshot} hidden={false} onToggleHidden={jest.fn()} />,
    );

    expect(screen.getByText('Visão Geral')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Investimentos' })).toBeOnTheScreen();
    expect(screen.getByText('Disponível para gastar')).toBeOnTheScreen();
    expect(screen.getByText('Você gastou 59% da sua receita.')).toBeOnTheScreen();
    expect(screen.getByText('Bitcoin')).toBeOnTheScreen();
    expect(screen.getByText('R$ 2.734,50')).toBeOnTheScreen();
  });

  it('dispara onToggleHidden a partir do header', async () => {
    const onToggleHidden = jest.fn();
    await render(
      <DesktopDashboard data={dashboardSnapshot} hidden={false} onToggleHidden={onToggleHidden} />,
    );

    await userEvent.setup().press(screen.getByRole('switch', { name: 'Ocultar valores' }));
    expect(onToggleHidden).toHaveBeenCalledTimes(1);
  });
});
