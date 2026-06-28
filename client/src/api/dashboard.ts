import { apiGet } from './client';
import type {
  Account,
  CategorySpend,
  Diagnosis,
  EsteMes,
  Investment,
  InvestmentsSummary,
  MonthBalance,
} from '../types/dashboard';

// month opcional vira ?month=YYYY-MM; omitido = mês corrente (default do server).
const monthQuery = (month?: string) => (month ? `?month=${month}` : '');

export const getAccounts = () => apiGet<Account[]>('/accounts');

export const getMonthBalance = (month?: string) =>
  apiGet<MonthBalance>(`/dashboard/summary${monthQuery(month)}`);

export const getCategories = (month?: string) =>
  apiGet<CategorySpend[]>(`/dashboard/categories${monthQuery(month)}`);

export const getEsteMes = (month?: string) =>
  apiGet<EsteMes>(`/dashboard/este-mes${monthQuery(month)}`);

export const getDiagnosis = (month?: string) =>
  apiGet<Diagnosis>(`/dashboard/diagnosis${monthQuery(month)}`);

export const getInvestments = () => apiGet<Investment[]>('/investments');

export const getInvestmentsSummary = () =>
  apiGet<InvestmentsSummary>('/dashboard/investments-summary');
