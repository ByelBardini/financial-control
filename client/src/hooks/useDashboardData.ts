import { dashboardSnapshot } from '../mocks/dashboardSnapshot';
import type { DashboardSnapshot } from '../types/dashboard';

interface DashboardQuery {
  data: DashboardSnapshot;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

// Seam de dados no formato do TanStack Query. Hoje lê o mock; trocar o corpo por
// useQuery({ queryKey: ['dashboard'], queryFn }) depois não toca nenhum consumidor.
export function useDashboardData(): DashboardQuery {
  return { data: dashboardSnapshot, isLoading: false, isError: false, error: null };
}
