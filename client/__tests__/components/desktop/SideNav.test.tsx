import { render, screen, userEvent } from '@testing-library/react-native';
import { SideNav } from '../../../src/components/desktop/SideNav';

describe('SideNav', () => {
  it('mostra marca, perfil e os destinos, com Início selecionado', async () => {
    await render(<SideNav />);

    expect(screen.getByText('Pobrify')).toBeOnTheScreen();
    expect(screen.getByText('Gestão de Crise')).toBeOnTheScreen();
    for (const label of ['Início', 'Transações', 'Contas', 'Investimentos', 'Ajustes']) {
      expect(screen.getByRole('button', { name: label })).toBeOnTheScreen();
    }
    expect(screen.getByRole('button', { name: 'Início' })).toBeSelected();
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
