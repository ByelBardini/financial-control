import { act, renderHook } from '@testing-library/react-native';
import { useTransactionFilters } from '../../src/hooks/useTransactionFilters';

describe('useTransactionFilters', () => {
  it('começa em 30d/sem categorias/sem busca e sem filtros ativos', async () => {
    const { result } = await renderHook(() => useTransactionFilters());
    expect(result.current.filters).toEqual({
      period: '30d',
      categoryIds: [],
      query: '',
      from: '',
      to: '',
    });
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it('setPeriod marca ativo; o default 30d não é "filtro ativo"', async () => {
    const { result } = await renderHook(() => useTransactionFilters());
    await act(async () => result.current.setPeriod('3m'));
    expect(result.current.filters.period).toBe('3m');
    expect(result.current.hasActiveFilters).toBe(true);
    await act(async () => result.current.setPeriod('30d'));
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it('toggleCategory adiciona e remove (multi-seleção, OR)', async () => {
    const { result } = await renderHook(() => useTransactionFilters());
    await act(async () => result.current.toggleCategory('c1'));
    await act(async () => result.current.toggleCategory('c2'));
    expect(result.current.filters.categoryIds).toEqual(['c1', 'c2']);
    expect(result.current.hasActiveFilters).toBe(true);
    await act(async () => result.current.toggleCategory('c1'));
    expect(result.current.filters.categoryIds).toEqual(['c2']);
  });

  it('custom: setFrom/setTo entram no filtro', async () => {
    const { result } = await renderHook(() => useTransactionFilters());
    await act(async () => {
      result.current.setPeriod('custom');
      result.current.setFrom('2026-01-10');
      result.current.setTo('2026-02-20');
    });
    expect(result.current.filters).toMatchObject({
      period: 'custom',
      from: '2026-01-10',
      to: '2026-02-20',
    });
  });

  it('a busca vira filters.query só após o debounce', async () => {
    jest.useFakeTimers();
    try {
      const { result } = await renderHook(() => useTransactionFilters());
      await act(async () => result.current.setSearchText('uber'));
      expect(result.current.filters.query).toBe(''); // ainda no debounce
      await act(async () => jest.advanceTimersByTime(300));
      expect(result.current.filters.query).toBe('uber');
    } finally {
      jest.useRealTimers();
    }
  });

  it('clearAll zera busca e filtros (volta ao 30d)', async () => {
    const { result } = await renderHook(() => useTransactionFilters());
    await act(async () => {
      result.current.setPeriod('custom');
      result.current.setFrom('2026-01-10');
      result.current.toggleCategory('c1');
      result.current.setSearchText('x');
    });
    await act(async () => result.current.clearAll());
    expect(result.current.filters).toEqual({
      period: '30d',
      categoryIds: [],
      query: '',
      from: '',
      to: '',
    });
    expect(result.current.searchText).toBe('');
    expect(result.current.hasActiveFilters).toBe(false);
  });
});
