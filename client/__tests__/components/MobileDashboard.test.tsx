import { render, screen, userEvent } from '@testing-library/react-native';
import { MobileDashboard } from '../../src/components/MobileDashboard';
import { dashboardSnapshot } from '../../src/mocks/dashboardSnapshot';

describe('MobileDashboard', () => {
  it('compõe todas as seções do mobile', async () => {
    await render(
      <MobileDashboard data={dashboardSnapshot} hidden={false} onToggleHidden={jest.fn()} />,
    );

    expect(screen.getByText('Pobrify')).toBeOnTheScreen();
    expect(screen.getByText('Saldo do Mês')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Contas' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Investimentos (Risos)' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Gastos por Categoria' })).toBeOnTheScreen();
    expect(screen.getByText('Diagnóstico Pobrify')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Início' })).toBeOnTheScreen();
  });

  it('dispara onToggleHidden ao tocar no switch', async () => {
    const onToggleHidden = jest.fn();
    await render(
      <MobileDashboard data={dashboardSnapshot} hidden={false} onToggleHidden={onToggleHidden} />,
    );

    await userEvent.setup().press(screen.getByRole('switch', { name: 'Ocultar valores' }));
    expect(onToggleHidden).toHaveBeenCalledTimes(1);
  });

  it('mascara os valores quando hidden', async () => {
    await render(<MobileDashboard data={dashboardSnapshot} hidden onToggleHidden={jest.fn()} />);

    expect(screen.queryByText('R$ 1.284,50')).toBeNull();
    expect(screen.getAllByLabelText('valor oculto').length).toBeGreaterThan(0);
  });
});
