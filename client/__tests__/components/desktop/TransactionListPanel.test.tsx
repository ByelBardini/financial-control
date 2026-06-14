import { render, screen } from '@testing-library/react-native';
import { TransactionListPanel } from '../../../src/components/desktop/TransactionListPanel';
import { transacoesSnapshot } from '../../../src/mocks/transacoesSnapshot';

const { transactions } = transacoesSnapshot;

describe('TransactionListPanel (desktop)', () => {
  it('mostra as abas, a contagem e as linhas de transação', async () => {
    await render(<TransactionListPanel transactions={transactions} hidden={false} />);

    expect(screen.getByRole('tab', { name: 'Recentes' })).toBeSelected();
    expect(screen.getByText('Exibindo 4 tragédias')).toBeOnTheScreen();
    expect(screen.getByText('iFood - "Só hoje"')).toBeOnTheScreen();
    expect(screen.getByText('Farmácia')).toBeOnTheScreen();
  });

  it('mostra o rodapé de paginação', async () => {
    await render(<TransactionListPanel transactions={transactions} hidden={false} />);

    expect(screen.getByText('Anterior')).toBeOnTheScreen();
    expect(screen.getByText('Próxima')).toBeOnTheScreen();
  });
});
