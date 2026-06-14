import { useQuery } from '@tanstack/react-query';
import {
  getCashflowSummary,
  getFutureDebts,
  getRecurrences,
  getTransactions,
} from '../api/transacoes';

// Hooks por recurso da tela de Transações: cada um é um useQuery com chave estável sob
// o namespace ['transacoes', ...]. Toda chamada mora em src/api/transacoes; aqui só o
// wrapper de cache do React Query (mesmo padrão de useContasQueries/useDashboardQueries).

export const useCashflowSummary = () =>
  useQuery({ queryKey: ['transacoes', 'summary'], queryFn: () => getCashflowSummary() });

export const useTransactions = () =>
  useQuery({ queryKey: ['transacoes', 'list'], queryFn: () => getTransactions() });

export const useRecurrences = () =>
  useQuery({ queryKey: ['transacoes', 'recurrences'], queryFn: () => getRecurrences() });

export const useFutureDebts = () =>
  useQuery({ queryKey: ['transacoes', 'debts'], queryFn: () => getFutureDebts() });
