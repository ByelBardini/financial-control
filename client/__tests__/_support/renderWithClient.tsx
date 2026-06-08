import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import * as api from '../../src/api/dashboard';
import * as contasApi from '../../src/api/contas';
import { dashboardSnapshot } from '../../src/mocks/dashboardSnapshot';
import { contasSnapshot } from '../../src/mocks/contasSnapshot';
import type { DashboardSnapshot } from '../../src/types/dashboard';
import type { ContasSnapshot } from '../../src/types/contas';

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
  jest.mocked(api.getTicker).mockResolvedValue(snapshot.ticker);
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

// Renderiza ui dentro de um QueryClient de teste (retry off, gcTime 0 pra não
// segurar o processo). render é assíncrono no RNTL 14 — use await.
export function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}
