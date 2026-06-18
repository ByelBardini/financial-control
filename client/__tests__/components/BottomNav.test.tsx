import { render, screen, userEvent } from '@testing-library/react-native';
import { BottomNav } from '../../src/components/BottomNav';

describe('BottomNav', () => {
  it('mostra os cinco destinos, com Início selecionado por padrão', async () => {
    await render(<BottomNav />);

    for (const label of ['Início', 'Transações', 'Contas', 'Investimentos', 'Ajustes']) {
      expect(screen.getByRole('button', { name: label })).toBeOnTheScreen();
    }
    expect(screen.getByRole('button', { name: 'Início' })).toBeSelected();
  });

  it('marca o destino atual conforme currentRoute', async () => {
    await render(<BottomNav currentRoute="contas" onNavigate={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Contas' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Início' })).not.toBeSelected();
  });

  it('navega ao tocar num destino ligado', async () => {
    const onNavigate = jest.fn();
    await render(<BottomNav currentRoute="contas" onNavigate={onNavigate} />);

    await userEvent.setup().press(screen.getByRole('button', { name: 'Início' }));

    expect(onNavigate).toHaveBeenCalledWith('dashboard');
  });

  it('navega para Transações ao tocar no destino', async () => {
    const onNavigate = jest.fn();
    await render(<BottomNav currentRoute="dashboard" onNavigate={onNavigate} />);

    await userEvent.setup().press(screen.getByRole('button', { name: 'Transações' }));

    expect(onNavigate).toHaveBeenCalledWith('transacoes');
  });

  it('não navega ao tocar num destino decorativo', async () => {
    const onNavigate = jest.fn();
    await render(<BottomNav currentRoute="dashboard" onNavigate={onNavigate} />);

    await userEvent.setup().press(screen.getByRole('button', { name: 'Investimentos' }));

    expect(onNavigate).not.toHaveBeenCalled();
  });
});
