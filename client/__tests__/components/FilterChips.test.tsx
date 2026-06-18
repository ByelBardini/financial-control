import { render, screen, userEvent } from '@testing-library/react-native';
import { FilterChips } from '../../src/components/FilterChips';
import type { Category, TransactionFilters } from '../../src/types/transacoes';

const cats: Category[] = [
  { id: 'c1', name: 'Alimentação', icon: 'restaurant', kind: 'expense' },
  { id: 'c2', name: 'Transporte', icon: 'directions_car', kind: 'expense' },
];

const handlers = () => ({
  onClearPeriod: jest.fn(),
  onRemoveCategory: jest.fn(),
  onClearQuery: jest.fn(),
  onClearAll: jest.fn(),
});

describe('FilterChips (multi)', () => {
  it('mostra contagem, chip de período e um chip por categoria; remove e limpa', async () => {
    const h = handlers();
    const filters: TransactionFilters = {
      period: '3m',
      categoryIds: ['c1', 'c2'],
      query: 'uber',
      from: '',
      to: '',
    };
    await render(<FilterChips filters={filters} categories={cats} total={3} {...h} />);

    expect(screen.getByText('3 transações')).toBeOnTheScreen();
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Remover filtro 3 Meses' }));
    expect(h.onClearPeriod).toHaveBeenCalled();

    await user.press(screen.getByRole('button', { name: 'Remover filtro Transporte' }));
    expect(h.onRemoveCategory).toHaveBeenCalledWith('c2');

    await user.press(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(h.onClearAll).toHaveBeenCalled();
  });

  it('default (30d, sem categoria/busca) só mostra a contagem (sem "Limpar")', async () => {
    const filters: TransactionFilters = {
      period: '30d',
      categoryIds: [],
      query: '',
      from: '',
      to: '',
    };
    await render(<FilterChips filters={filters} categories={cats} total={6} {...handlers()} />);

    expect(screen.getByText('6 transações')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Remover filtro 30 Dias' })).toBeNull();
  });
});
