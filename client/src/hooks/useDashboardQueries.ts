import { useQuery } from '@tanstack/react-query';
import {
  getAccounts,
  getCategories,
  getDiagnosis,
  getEsteMes,
  getInvestments,
  getInvestmentsSummary,
  getMonthBalance,
  getTicker,
} from '../api/dashboard';

// Hooks por recurso: cada um é um useQuery com chave estável (o mês entra na chave
// onde o endpoint aceita, pra cache por mês). month omitido = mês corrente.
// Toda chamada de API mora em src/api; aqui só há o wrapper de cache do React Query.

export const useAccounts = () => useQuery({ queryKey: ['accounts'], queryFn: () => getAccounts() });

export const useMonthBalance = (month?: string) =>
  useQuery({
    queryKey: ['dashboard', 'summary', month ?? 'current'],
    queryFn: () => getMonthBalance(month),
  });

export const useCategories = (month?: string) =>
  useQuery({
    queryKey: ['dashboard', 'categories', month ?? 'current'],
    queryFn: () => getCategories(month),
  });

export const useEsteMes = (month?: string) =>
  useQuery({
    queryKey: ['dashboard', 'este-mes', month ?? 'current'],
    queryFn: () => getEsteMes(month),
  });

export const useDiagnosis = (month?: string) =>
  useQuery({
    queryKey: ['dashboard', 'diagnosis', month ?? 'current'],
    queryFn: () => getDiagnosis(month),
  });

export const useInvestments = () =>
  useQuery({ queryKey: ['investments'], queryFn: () => getInvestments() });

export const useInvestmentsSummary = () =>
  useQuery({
    queryKey: ['dashboard', 'investments-summary'],
    queryFn: () => getInvestmentsSummary(),
  });

export const useTicker = () =>
  useQuery({ queryKey: ['dashboard', 'ticker'], queryFn: () => getTicker() });
