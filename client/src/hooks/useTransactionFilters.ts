import { useCallback, useMemo, useState } from 'react';
import { useDebouncedValue } from './useDebouncedValue';
import type { TransactionFilters, TransactionPeriod } from '../types/transacoes';

// Controlador dos filtros da lista de Transações: o que a tela possui e passa aos dois
// layouts. period (default '30d') + categoryIds (multi, OR) + from/to (custom) são estado
// direto; a busca é o texto cru (searchText), e filters.query é DERIVADO dele com debounce
// (sem effect — só uma memo). Limpar/remover chip mexem no estado; o query acompanha.
export type TransactionControls = {
  filters: TransactionFilters;
  searchText: string;
  hasActiveFilters: boolean;
  setSearchText: (text: string) => void;
  setPeriod: (period: TransactionPeriod) => void;
  toggleCategory: (id: string) => void;
  setFrom: (date: string) => void;
  setTo: (date: string) => void;
  clearPeriod: () => void;
  clearCategory: () => void;
  clearQuery: () => void;
  clearAll: () => void;
};

export function useTransactionFilters(): TransactionControls {
  const [period, setPeriodState] = useState<TransactionPeriod>('30d');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [searchText, setSearchText] = useState('');
  const query = useDebouncedValue(searchText.trim(), 300);

  const filters = useMemo<TransactionFilters>(
    () => ({ period, categoryIds, query, from, to }),
    [period, categoryIds, query, from, to],
  );

  const setPeriod = useCallback((next: TransactionPeriod) => setPeriodState(next), []);
  const toggleCategory = useCallback(
    (id: string) =>
      setCategoryIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id])),
    [],
  );
  const clearPeriod = useCallback(() => {
    setPeriodState('30d');
    setFrom('');
    setTo('');
  }, []);
  const clearCategory = useCallback(() => setCategoryIds([]), []);
  const clearQuery = useCallback(() => setSearchText(''), []);
  const clearAll = useCallback(() => {
    setPeriodState('30d');
    setCategoryIds([]);
    setFrom('');
    setTo('');
    setSearchText('');
  }, []);

  const hasActiveFilters = period !== '30d' || categoryIds.length > 0 || query !== '';

  return {
    filters,
    searchText,
    hasActiveFilters,
    setSearchText,
    setPeriod,
    toggleCategory,
    setFrom,
    setTo,
    clearPeriod,
    clearCategory,
    clearQuery,
    clearAll,
  };
}
