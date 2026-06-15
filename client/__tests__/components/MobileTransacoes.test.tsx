import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { MobileTransacoes } from '../../src/components/MobileTransacoes';
import { useTransactionFilters } from '../../src/hooks/useTransactionFilters';
import * as api from '../../src/api/transacoes';
import { transacoesSnapshot } from '../../src/mocks/transacoesSnapshot';
import { mockTransacoesApi, renderWithClient } from '../_support/renderWithClient';

jest.mock('../../src/api/transacoes');

beforeEach(() => {
  jest.clearAllMocks();
  mockTransacoesApi();
});

function Harness() {
  const controls = useTransactionFilters();
  return (
    <MobileTransacoes
      hidden={false}
      onToggleHidden={() => {}}
      controls={controls}
      route="transacoes"
    />
  );
}

describe('MobileTransacoes', () => {
  it('renderiza fluxo, colapso, transações, recorrências e dívidas; destaca Transações', async () => {
    await renderWithClient(<Harness />);

    expect(await screen.findByText('Previsão de Colapso')).toBeOnTheScreen();
    expect(screen.getByText('iFood - "Só hoje"')).toBeOnTheScreen();
    expect(screen.getByText('Netflix 4K')).toBeOnTheScreen();
    expect(screen.getByText('iPhone 15 Pro')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Transações' })).toBeSelected();
  });

  it('"Carregar mais" busca e acumula a próxima página', async () => {
    const [t0, t1] = transacoesSnapshot.transactions;
    jest
      .mocked(api.getTransactionsPage)
      .mockResolvedValueOnce({ items: [t0], page: 1, pageSize: 1, total: 2, pageCount: 2 })
      .mockResolvedValueOnce({ items: [t1], page: 2, pageSize: 1, total: 2, pageCount: 2 });

    await renderWithClient(<Harness />);
    await screen.findByText(t0.title);

    await userEvent.setup().press(screen.getByRole('button', { name: 'Carregar mais' }));

    await waitFor(() => expect(screen.getByText(t1.title)).toBeOnTheScreen());
  });
});
