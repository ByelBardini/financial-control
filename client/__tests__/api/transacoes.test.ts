import {
  getCashflowSummary,
  getCategories,
  getFutureDebts,
  getRecurrences,
  getTransactionsPage,
} from '../../src/api/transacoes';
import * as client from '../../src/api/client';
import type { TransactionFilters } from '../../src/types/transacoes';

jest.mock('../../src/api/client');

beforeEach(() => jest.clearAllMocks());

const noFilters: TransactionFilters = {
  period: '30d',
  categoryIds: [],
  query: '',
  from: '',
  to: '',
};

// Cada função de src/api/transacoes é dona de um path literal; getTransactionsPage ainda
// monta a querystring dos filtros. Um typo aqui quebraria a tela sem teste pegar.
describe('api/transacoes', () => {
  it('getCashflowSummary faz GET /transacoes/summary', async () => {
    jest.mocked(client.apiGet).mockResolvedValue({} as never);
    await getCashflowSummary();
    expect(client.apiGet).toHaveBeenCalledWith('/transacoes/summary');
  });

  it('default (30d) na página 1 → /transacoes/list (sem query)', async () => {
    jest.mocked(client.apiGet).mockResolvedValue({} as never);
    await getTransactionsPage(noFilters, 1);
    expect(client.apiGet).toHaveBeenCalledWith('/transacoes/list');
  });

  it('monta multi-categoria (repetida) + period + q + page', async () => {
    jest.mocked(client.apiGet).mockResolvedValue({} as never);
    await getTransactionsPage(
      { period: '3m', categoryIds: ['c1', 'c2'], query: 'mercado', from: '', to: '' },
      2,
    );
    expect(client.apiGet).toHaveBeenCalledWith(
      '/transacoes/list?period=3m&category=c1&category=c2&q=mercado&page=2',
    );
  });

  it('no period custom envia from/to', async () => {
    jest.mocked(client.apiGet).mockResolvedValue({} as never);
    await getTransactionsPage(
      { period: 'custom', categoryIds: [], query: '', from: '2026-01-10', to: '2026-02-20' },
      1,
    );
    expect(client.apiGet).toHaveBeenCalledWith(
      '/transacoes/list?period=custom&from=2026-01-10&to=2026-02-20',
    );
  });

  it('getCategories faz GET /categories', async () => {
    jest.mocked(client.apiGet).mockResolvedValue([] as never);
    await getCategories();
    expect(client.apiGet).toHaveBeenCalledWith('/categories');
  });

  it('getRecurrences/getFutureDebts mantêm os paths', async () => {
    jest.mocked(client.apiGet).mockResolvedValue([] as never);
    await getRecurrences();
    expect(client.apiGet).toHaveBeenCalledWith('/transacoes/recurrences');
    await getFutureDebts();
    expect(client.apiGet).toHaveBeenCalledWith('/transacoes/debts');
  });
});
