import { render, screen, userEvent } from '@testing-library/react-native';
import { SideNav } from '../../../src/components/desktop/SideNav';

describe('SideNav', () => {
  it('mostra marca, perfil e os destinos, com Início selecionado por padrão', async () => {
    await render(<SideNav />);

    expect(screen.getByText('Pobrify')).toBeOnTheScreen();
    for (const label of ['Início', 'Transações', 'Contas', 'Investimentos', 'Ajustes']) {
      expect(screen.getByRole('button', { name: label })).toBeOnTheScreen();
    }
    expect(screen.getByRole('button', { name: 'Início' })).toBeSelected();
  });

  it('marca o destino atual conforme currentRoute', async () => {
    await render(<SideNav currentRoute="contas" onNavigate={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Contas' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Início' })).not.toBeSelected();
  });

  it('navega ao clicar num destino ligado', async () => {
    const onNavigate = jest.fn();
    await render(<SideNav currentRoute="contas" onNavigate={onNavigate} />);

    await userEvent.setup().press(screen.getByRole('button', { name: 'Início' }));

    expect(onNavigate).toHaveBeenCalledWith('dashboard');
  });

  it('navega para Investimentos ao clicar no destino', async () => {
    const onNavigate = jest.fn();
    await render(<SideNav currentRoute="dashboard" onNavigate={onNavigate} />);

    await userEvent.setup().press(screen.getByRole('button', { name: 'Investimentos' }));

    expect(onNavigate).toHaveBeenCalledWith('investimentos');
  });

  it('mostra o botão Sair quando onLogout é fornecido e o dispara', async () => {
    const onLogout = jest.fn();
    await render(<SideNav onLogout={onLogout} />);

    await userEvent.setup().press(screen.getByRole('button', { name: 'Sair' }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('não mostra o botão Sair sem onLogout', async () => {
    await render(<SideNav />);
    expect(screen.queryByRole('button', { name: 'Sair' })).toBeNull();
  });
});
