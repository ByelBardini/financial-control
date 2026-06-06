import { render, screen } from '@testing-library/react-native';
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
});
