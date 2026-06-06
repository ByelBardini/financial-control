import { renderHook } from '@testing-library/react-native';
import { useDashboardData } from '../../src/hooks/useDashboardData';

describe('useDashboardData', () => {
  it('entrega o snapshot mockado pronto, sem loading nem erro', async () => {
    const { result } = await renderHook(() => useDashboardData());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.data.balance.netCents).toBe(128450);
    expect(result.current.data.accounts).toHaveLength(4);
    expect(result.current.data.categories).toHaveLength(4);
  });
});
