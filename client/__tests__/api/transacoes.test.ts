import {
  getCashflowSummary,
  getFutureDebts,
  getRecurrences,
  getTransactions,
} from '../../src/api/transacoes';
import { transacoesSnapshot } from '../../src/mocks/transacoesSnapshot';

// A tela de Transações ainda não tem backend: src/api/transacoes serve o fixture via
// Promise.resolve (mantendo os hooks React Query + o gate QuerySection). Estes testes
// travam cada função à sua fatia do snapshot — o flip pra apiGet depois troca a impl,
// não o contrato. Mesmo papel do teste de paths em api/contas.
describe('api/transacoes (mock-backed)', () => {
  it('getCashflowSummary resolve o resumo de fluxo de caixa', async () => {
    await expect(getCashflowSummary()).resolves.toEqual(transacoesSnapshot.summary);
  });

  it('getTransactions resolve a lista de transações', async () => {
    await expect(getTransactions()).resolves.toEqual(transacoesSnapshot.transactions);
  });

  it('getRecurrences resolve as recorrências', async () => {
    await expect(getRecurrences()).resolves.toEqual(transacoesSnapshot.recurrences);
  });

  it('getFutureDebts resolve as dívidas futuras', async () => {
    await expect(getFutureDebts()).resolves.toEqual(transacoesSnapshot.debts);
  });
});
