import { render, screen, userEvent } from '@testing-library/react-native';
import { CategoryFilter } from '../../src/components/CategoryFilter';
import type { Category } from '../../src/types/transacoes';

const cats: Category[] = [
  { id: 'c1', name: 'Alimentação', icon: 'restaurant', kind: 'expense' },
  { id: 'c2', name: 'Transporte', icon: 'directions_car', kind: 'expense' },
];

describe('CategoryFilter (multi)', () => {
  it('abre, alterna uma categoria SEM fechar e marca a já selecionada', async () => {
    const onToggle = jest.fn();
    await render(
      <CategoryFilter categories={cats} value={['c2']} onToggle={onToggle} onClear={jest.fn()} />,
    );
    const user = userEvent.setup();

    // 1 selecionada → rótulo é o nome dela.
    await user.press(screen.getByRole('button', { name: 'Filtrar por categoria: Transporte' }));
    expect(screen.getByRole('checkbox', { name: 'Transporte' })).toBeChecked();

    // Marcar outra chama onToggle e NÃO fecha (o "Pronto" segue na tela).
    await user.press(screen.getByRole('checkbox', { name: 'Alimentação' }));
    expect(onToggle).toHaveBeenCalledWith('c1');
    expect(screen.getByRole('button', { name: 'Pronto' })).toBeOnTheScreen();
  });

  it('com 2+ selecionadas o rótulo vira "N categorias"', async () => {
    await render(
      <CategoryFilter
        categories={cats}
        value={['c1', 'c2']}
        onToggle={jest.fn()}
        onClear={jest.fn()}
      />,
    );
    expect(
      screen.getByRole('button', { name: 'Filtrar por categoria: 2 categorias' }),
    ).toBeOnTheScreen();
  });
});
