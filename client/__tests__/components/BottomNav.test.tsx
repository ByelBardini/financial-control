import { render, screen } from '@testing-library/react-native';
import { BottomNav } from '../../src/components/BottomNav';

describe('BottomNav', () => {
  it('mostra os cinco destinos, com Início selecionado', async () => {
    await render(<BottomNav />);

    for (const label of ['Início', 'Transações', 'Contas', 'Investimentos', 'Ajustes']) {
      expect(screen.getByRole('button', { name: label })).toBeOnTheScreen();
    }
    expect(screen.getByRole('button', { name: 'Início' })).toBeSelected();
  });
});
