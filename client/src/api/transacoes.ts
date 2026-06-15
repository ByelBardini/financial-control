import { apiGet } from './client';
import type {
  CashflowSummary,
  Category,
  FutureDebt,
  Recurrence,
  TransactionFilters,
  TransactionPage,
} from '../types/transacoes';

// Views da tela de Transações, ligadas à API real (mesmo padrão de src/api/contas). O
// backend (domínio transacoes) filtra/pagina e deriva labels/tag/colapso — o client só
// monta a querystring. O CRUD de transação vive em /transactions (sem consumidor ainda).

export const getCashflowSummary = () => apiGet<CashflowSummary>('/transacoes/summary');

// listQuery monta a querystring da lista a partir dos filtros + página, omitindo o que é
// default/vazio (period 30d, sem categoria, busca vazia, página 1) — URL limpa. category é
// repetível (uma por id); from/to só no period custom.
function listQuery(filters: TransactionFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.period !== '30d') params.set('period', filters.period);
  filters.categoryIds.forEach((id) => params.append('category', id));
  if (filters.period === 'custom') {
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
  }
  if (filters.query.trim()) params.set('q', filters.query.trim());
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const getTransactionsPage = (filters: TransactionFilters, page: number) =>
  apiGet<TransactionPage>(`/transacoes/list${listQuery(filters, page)}`);

export const getRecurrences = () => apiGet<Recurrence[]>('/transacoes/recurrences');

export const getFutureDebts = () => apiGet<FutureDebt[]>('/transacoes/debts');

export const getCategories = () => apiGet<Category[]>('/categories');
