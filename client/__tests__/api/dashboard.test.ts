import { apiGet } from '../../src/api/client';
import {
  getAccounts,
  getCategories,
  getDiagnosis,
  getEsteMes,
  getInvestments,
  getInvestmentsSummary,
  getMonthBalance,
} from '../../src/api/dashboard';

// Mocka o único fetch (apiGet) e verifica só o PATH montado por função — é o que
// essa camada decide (monthQuery + endpoint). A serialização real vive em client.ts.
jest.mock('../../src/api/client');

beforeEach(() => {
  jest.mocked(apiGet).mockResolvedValue(undefined as never);
});
afterEach(() => {
  jest.clearAllMocks();
});

describe('camada api/dashboard', () => {
  it('anexa ?month=YYYY-MM quando há month', () => {
    void getMonthBalance('2026-05');
    expect(apiGet).toHaveBeenCalledWith('/dashboard/summary?month=2026-05');
  });

  it('omite a query string quando month é undefined', () => {
    void getMonthBalance();
    expect(apiGet).toHaveBeenCalledWith('/dashboard/summary');
  });

  it('as views por mês repassam o month no path', () => {
    void getCategories('2026-05');
    void getEsteMes('2026-05');
    void getDiagnosis('2026-05');
    expect(apiGet).toHaveBeenCalledWith('/dashboard/categories?month=2026-05');
    expect(apiGet).toHaveBeenCalledWith('/dashboard/este-mes?month=2026-05');
    expect(apiGet).toHaveBeenCalledWith('/dashboard/diagnosis?month=2026-05');
  });

  it('os endpoints sem mês batem no path fixo', () => {
    void getAccounts();
    void getInvestments();
    void getInvestmentsSummary();
    expect(apiGet).toHaveBeenCalledWith('/accounts');
    expect(apiGet).toHaveBeenCalledWith('/investments');
    expect(apiGet).toHaveBeenCalledWith('/dashboard/investments-summary');
  });
});
