import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import * as api from '../../src/api/dashboard';
import { dashboardSnapshot } from '../../src/mocks/dashboardSnapshot';
import type { DashboardSnapshot } from '../../src/types/dashboard';

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

// Renderiza ui dentro de um QueryClient de teste (retry off, gcTime 0 pra não
// segurar o processo). render é assíncrono no RNTL 14 — use await.
export function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}
