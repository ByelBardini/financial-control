import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  getCashflowSummary,
  getCategories,
  getFutureDebts,
  getRecurrences,
  getTransactionsPage,
} from '../api/transacoes';
import type { TransactionFilters } from '../types/transacoes';

// Hooks por recurso da tela de Transações, sob o namespace ['transacoes', ...]. A lista
// tem duas formas: paginada (desktop) e acumulada/infinita (mobile "Carregar mais"); as
// duas compartilham getTransactionsPage e a chave inclui os filtros (refetch ao mudar).

export const useCashflowSummary = () =>
  useQuery({ queryKey: ['transacoes', 'summary'], queryFn: () => getCashflowSummary() });

// Desktop: uma página por vez. placeholderData mantém a página anterior visível na troca
// (keepPreviousData do v5) — paginação sem "piscar".
export const useTransactionsPage = (filters: TransactionFilters, page: number) =>
  useQuery({
    queryKey: ['transacoes', 'list', filters, page],
    queryFn: () => getTransactionsPage(filters, page),
    placeholderData: (prev) => prev,
  });

// Mobile: páginas acumuladas via "Carregar mais". getNextPageParam para quando chega no fim.
export const useTransactionsInfinite = (filters: TransactionFilters) =>
  useInfiniteQuery({
    queryKey: ['transacoes', 'list', 'infinite', filters],
    queryFn: ({ pageParam }) => getTransactionsPage(filters, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.pageCount ? last.page + 1 : undefined),
  });

export const useCategories = () =>
  useQuery({ queryKey: ['transacoes', 'categories'], queryFn: () => getCategories() });

export const useRecurrences = () =>
  useQuery({ queryKey: ['transacoes', 'recurrences'], queryFn: () => getRecurrences() });

export const useFutureDebts = () =>
  useQuery({ queryKey: ['transacoes', 'debts'], queryFn: () => getFutureDebts() });
