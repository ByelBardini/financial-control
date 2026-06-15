import { render, screen, userEvent } from '@testing-library/react-native';
import { TransactionListPanel } from '../../../src/components/desktop/TransactionListPanel';
import { transacoesSnapshot } from '../../../src/mocks/transacoesSnapshot';
import type { TransactionControls } from '../../../src/hooks/useTransactionFilters';

const { transactions } = transacoesSnapshot;

function makeControls(overrides: Partial<TransactionControls> = {}): TransactionControls {
  return {
    filters: { period: '30d', categoryIds: [], query: '', from: '', to: '' },
    searchText: '',
    hasActiveFilters: false,
    setSearchText: jest.fn(),
    setPeriod: jest.fn(),
    toggleCategory: jest.fn(),
    setFrom: jest.fn(),
    setTo: jest.fn(),
    clearPeriod: jest.fn(),
    clearCategory: jest.fn(),
    clearQuery: jest.fn(),
    clearAll: jest.fn(),
    ...overrides,
  };
}

const baseProps = (controls: TransactionControls) => ({
  transactions,
  total: transactions.length,
  hidden: false,
  controls,
  categories: [],
  page: 1,
  pageCount: 1,
  onPrev: jest.fn(),
  onNext: jest.fn(),
});

describe('TransactionListPanel (desktop)', () => {
  it('mostra os dropdowns de período/categoria, a contagem e as linhas', async () => {
    await render(<TransactionListPanel {...baseProps(makeControls())} />);

    expect(screen.getByRole('button', { name: 'Período: 30 Dias' })).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Filtrar por categoria: Todas as categorias' }),
    ).toBeOnTheScreen();
    expect(screen.getByText(`${transactions.length} transações`)).toBeOnTheScreen();
    expect(screen.getByText('iFood - "Só hoje"')).toBeOnTheScreen();
    expect(screen.getByText('Farmácia')).toBeOnTheScreen();
  });

  it('escolher "3 Meses" no dropdown de período chama setPeriod', async () => {
    const controls = makeControls();
    await render(<TransactionListPanel {...baseProps(controls)} />);
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Período: 30 Dias' }));
    await user.press(screen.getByRole('menuitem', { name: '3 Meses' }));
    expect(controls.setPeriod).toHaveBeenCalledWith('3m');
  });

  it('paginação: Anterior desabilitado na 1ª, Próxima navega', async () => {
    const props = { ...baseProps(makeControls()), pageCount: 3 };
    await render(<TransactionListPanel {...props} />);

    expect(screen.getByText('Página 1 de 3')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Próxima' }));
    expect(props.onNext).toHaveBeenCalled();
  });

  it('lista vazia mostra a mensagem de "nenhuma transação"', async () => {
    const props = { ...baseProps(makeControls()), transactions: [], total: 0 };
    await render(<TransactionListPanel {...props} />);
    expect(screen.getByText('Nenhuma transação encontrada.')).toBeOnTheScreen();
  });
});
