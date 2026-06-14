import {
  getCashflowSummary,
  getFutureDebts,
  getRecurrences,
  getTransactions,
} from '../../src/api/transacoes';
import * as client from '../../src/api/client';

jest.mock('../../src/api/client');

beforeEach(() => jest.clearAllMocks());

// Cada função de src/api/transacoes é dona de um path literal — um typo aqui quebraria a
// tela em runtime sem nenhum teste pegar. Mesma cobertura de api/contas e api/dashboard.
describe('api/transacoes', () => {
  it('getCashflowSummary faz GET /transacoes/summary', async () => {
    jest.mocked(client.apiGet).mockResolvedValue({} as never);
    await getCashflowSummary();
    expect(client.apiGet).toHaveBeenCalledWith('/transacoes/summary');
  });

  it('getTransactions faz GET /transacoes/list', async () => {
    jest.mocked(client.apiGet).mockResolvedValue([] as never);
    await getTransactions();
    expect(client.apiGet).toHaveBeenCalledWith('/transacoes/list');
  });

  it('getRecurrences faz GET /transacoes/recurrences', async () => {
    jest.mocked(client.apiGet).mockResolvedValue([] as never);
    await getRecurrences();
    expect(client.apiGet).toHaveBeenCalledWith('/transacoes/recurrences');
  });

  it('getFutureDebts faz GET /transacoes/debts', async () => {
    jest.mocked(client.apiGet).mockResolvedValue([] as never);
    await getFutureDebts();
    expect(client.apiGet).toHaveBeenCalledWith('/transacoes/debts');
  });
});
