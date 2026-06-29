import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import * as api from '../../src/api/dashboard';
import * as contasApi from '../../src/api/contas';
import * as transacoesApi from '../../src/api/transacoes';
import * as investimentosApi from '../../src/api/investimentos';
import * as patrimonioApi from '../../src/api/patrimonio';
import { dashboardSnapshot } from '../../src/mocks/dashboardSnapshot';
import { contasSnapshot } from '../../src/mocks/contasSnapshot';
import { transacoesSnapshot } from '../../src/mocks/transacoesSnapshot';
import { investimentosSnapshot } from '../../src/mocks/investimentosSnapshot';
import { patrimonioSnapshot } from '../../src/mocks/patrimonioSnapshot';
import type { DashboardSnapshot } from '../../src/types/dashboard';
import type { ContasSnapshot } from '../../src/types/contas';
import type { TransacoesSnapshot } from '../../src/types/transacoes';
import type { InvestimentosSnapshot } from '../../src/types/investimentos';
import type { PatrimonioOverview } from '../../src/types/patrimonio';

// Faz cada função de src/api/dashboard resolver a fatia correspondente do snapshot.
// Requer `jest.mock('../../src/api/dashboard')` no topo do arquivo de teste.
export function mockDashboardApi(snapshot: DashboardSnapshot = dashboardSnapshot) {
  jest.mocked(api.getAccounts).mockResolvedValue(snapshot.accounts);
  jest.mocked(api.getMonthBalance).mockResolvedValue(snapshot.balance);
  jest.mocked(api.getCategories).mockResolvedValue(snapshot.categories);
  jest.mocked(api.getEsteMes).mockResolvedValue(snapshot.esteMes);
  jest.mocked(api.getDiagnosis).mockResolvedValue(snapshot.diagnosis);
  jest.mocked(api.getInvestments).mockResolvedValue(snapshot.investments);
  jest.mocked(api.getInvestmentsSummary).mockResolvedValue(snapshot.investmentsSummary);
}

// Idem para src/api/contas (cada view resolve a fatia correspondente do snapshot).
// Requer `jest.mock('../../src/api/contas')` no topo do arquivo de teste.
export function mockContasApi(snapshot: ContasSnapshot = contasSnapshot) {
  jest.mocked(contasApi.getBankAccounts).mockResolvedValue(snapshot.banks);
  jest.mocked(contasApi.getCreditCards).mockResolvedValue(snapshot.cards);
  jest.mocked(contasApi.getVouchers).mockResolvedValue(snapshot.vouchers);
  jest.mocked(contasApi.getCashWallet).mockResolvedValue(snapshot.cash);
  jest.mocked(contasApi.getPovertyXray).mockResolvedValue(snapshot.xray);
  jest.mocked(contasApi.getManagementTip).mockResolvedValue(snapshot.tip);
}

// Idem para src/api/transacoes (cada view resolve a fatia correspondente do snapshot).
// Requer `jest.mock('../../src/api/transacoes')` no topo do arquivo de teste.
export function mockTransacoesApi(snapshot: TransacoesSnapshot = transacoesSnapshot) {
  jest.mocked(transacoesApi.getCashflowSummary).mockResolvedValue(snapshot.summary);
  jest.mocked(transacoesApi.getTransactionsPage).mockResolvedValue({
    items: snapshot.transactions,
    page: 1,
    pageSize: 10,
    total: snapshot.transactions.length,
    pageCount: 1,
  });
  jest.mocked(transacoesApi.getCategories).mockResolvedValue([]);
  jest.mocked(transacoesApi.getRecurrences).mockResolvedValue(snapshot.recurrences);
  jest.mocked(transacoesApi.getFutureDebts).mockResolvedValue(snapshot.debts);
}

// Idem para src/api/investimentos (cada seção resolve a fatia correspondente do snapshot).
// Requer `jest.mock('../../src/api/investimentos')` no topo do arquivo de teste.
export function mockInvestimentosApi(snapshot: InvestimentosSnapshot = investimentosSnapshot) {
  jest.mocked(investimentosApi.getPortfolioSummary).mockResolvedValue(snapshot.summary);
  jest.mocked(investimentosApi.getPositions).mockResolvedValue(snapshot.positions);
  jest.mocked(investimentosApi.getAllocation).mockResolvedValue(snapshot.allocation);
  jest.mocked(investimentosApi.getCryptoBlock).mockResolvedValue(snapshot.crypto);
  jest.mocked(investimentosApi.getRiskAssessment).mockResolvedValue(snapshot.risk);
  jest.mocked(investimentosApi.getPortfolioEvolution).mockResolvedValue([]);
}

// Idem para src/api/patrimonio (o overview "quanto eu tenho hoje").
// Requer `jest.mock('../../src/api/patrimonio')` no topo do arquivo de teste.
export function mockPatrimonioApi(overview: PatrimonioOverview = patrimonioSnapshot) {
  jest.mocked(patrimonioApi.getPatrimonioOverview).mockResolvedValue(overview);
}

// Renderiza ui dentro de um QueryClient de teste (retry off, gcTime 0 pra não
// segurar o processo). render é assíncrono no RNTL 14 — use await.
export function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}
