import {
  createInstallmentPurchase,
  createRecurringRule,
  createTransaction,
  deleteTransaction,
  getCashflowSummary,
  getCategories,
  getFutureDebts,
  getRecurrences,
  getTransaction,
  getTransactionsPage,
  updateTransaction,
} from '../../src/api/transacoes';
import * as client from '../../src/api/client';
import type { CreateTransactionInput, TransactionFilters } from '../../src/types/transacoes';

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

  it('inclui pageSize quando informado (desktop calcula pela altura da tela)', async () => {
    jest.mocked(client.apiGet).mockResolvedValue({} as never);
    await getTransactionsPage(noFilters, 1, 15);
    expect(client.apiGet).toHaveBeenCalledWith('/transacoes/list?pageSize=15');
    await getTransactionsPage(noFilters, 2, 15);
    expect(client.apiGet).toHaveBeenCalledWith('/transacoes/list?page=2&pageSize=15');
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

// CRUD do recurso transação em /transactions[/{id}] (verbos REST: GET/POST/PATCH/DELETE).
describe('api/transacoes CRUD', () => {
  const input: CreateTransactionInput = {
    accountId: 'a1',
    categoryId: 'c1',
    description: 'Mercado',
    direction: 'outflow',
    amountCents: 5000,
    occurredOn: '2026-06-12',
  };

  it('getTransaction faz GET /transactions/{id}', async () => {
    jest.mocked(client.apiGet).mockResolvedValue({} as never);
    await getTransaction('t9');
    expect(client.apiGet).toHaveBeenCalledWith('/transactions/t9');
  });

  it('createTransaction faz POST /transactions com o input', async () => {
    jest.mocked(client.apiPost).mockResolvedValue({} as never);
    await createTransaction(input);
    expect(client.apiPost).toHaveBeenCalledWith('/transactions', input);
  });

  it('updateTransaction faz PATCH /transactions/{id} com o input', async () => {
    jest.mocked(client.apiPatch).mockResolvedValue({} as never);
    const { accountId: _drop, ...update } = input;
    await updateTransaction('t9', update);
    expect(client.apiPatch).toHaveBeenCalledWith('/transactions/t9', update);
  });

  it('deleteTransaction faz DELETE /transactions/{id}', async () => {
    jest.mocked(client.apiDelete).mockResolvedValue(undefined as never);
    await deleteTransaction('t9');
    expect(client.apiDelete).toHaveBeenCalledWith('/transactions/t9');
  });

  it('createInstallmentPurchase faz POST /transactions/installment-purchases com o input', async () => {
    jest.mocked(client.apiPost).mockResolvedValue({ created: 3 } as never);
    const installment = {
      accountId: 'a1',
      categoryId: 'c1',
      description: 'Notebook',
      amountCents: 30000,
      totalInstallments: 3,
      occurredOn: '2026-06-12',
    };
    await createInstallmentPurchase(installment);
    expect(client.apiPost).toHaveBeenCalledWith('/transactions/installment-purchases', installment);
  });

  it('createRecurringRule faz POST /recurring-rules com o input', async () => {
    jest.mocked(client.apiPost).mockResolvedValue({ created: true } as never);
    const rule = {
      accountId: 'a1',
      categoryId: 'c1',
      description: 'Salário',
      direction: 'inflow' as const,
      amountCents: 320000,
      frequency: 'monthly' as const,
      intervalCount: 1,
      startDate: '2026-06-01',
      endDate: null,
      maxOccurrences: null,
    };
    await createRecurringRule(rule);
    expect(client.apiPost).toHaveBeenCalledWith('/recurring-rules', rule);
  });
});
