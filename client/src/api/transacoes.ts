import { apiDelete, apiGet, apiPatch, apiPost } from './client';
import type {
  CashflowSummary,
  Category,
  CreateInstallmentInput,
  CreateRecurringRuleInput,
  CreateTransactionInput,
  FutureDebt,
  Recurrence,
  TransactionDetail,
  TransactionFilters,
  TransactionPage,
  UpdateTransactionInput,
} from '../types/transacoes';

// Views da tela de Transações, ligadas à API real (mesmo padrão de src/api/contas). O
// backend (domínio transacoes) filtra/pagina e deriva labels/tag/colapso — o client só
// monta a querystring. O CRUD de transação vive em /transactions (sem consumidor ainda).

export const getCashflowSummary = () => apiGet<CashflowSummary>('/transacoes/summary');

// listQuery monta a querystring da lista a partir dos filtros + página, omitindo o que é
// default/vazio (period 30d, sem categoria, busca vazia, página 1) — URL limpa. category é
// repetível (uma por id); from/to só no period custom. pageSize só vai quando informado (o
// desktop calcula pela altura da tela; sem ele o server usa o default).
function listQuery(filters: TransactionFilters, page: number, pageSize?: number): string {
  const params = new URLSearchParams();
  if (filters.period !== '30d') params.set('period', filters.period);
  filters.categoryIds.forEach((id) => params.append('category', id));
  if (filters.period === 'custom') {
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
  }
  if (filters.query.trim()) params.set('q', filters.query.trim());
  if (page > 1) params.set('page', String(page));
  if (pageSize && pageSize > 0) params.set('pageSize', String(pageSize));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const getTransactionsPage = (filters: TransactionFilters, page: number, pageSize?: number) =>
  apiGet<TransactionPage>(`/transacoes/list${listQuery(filters, page, pageSize)}`);

export const getRecurrences = () => apiGet<Recurrence[]>('/transacoes/recurrences');

export const getFutureDebts = () => apiGet<FutureDebt[]>('/transacoes/debts');

export const getCategories = () => apiGet<Category[]>('/categories');

// Recurso "transação" (CRUD) em /transactions. Dinheiro em centavos; data YYYY-MM-DD.
export const getTransaction = (id: string) => apiGet<TransactionDetail>(`/transactions/${id}`);

export const createTransaction = (input: CreateTransactionInput) =>
  apiPost<TransactionDetail>('/transactions', input);

export const updateTransaction = (id: string, input: UpdateTransactionInput) =>
  apiPatch<TransactionDetail>(`/transactions/${id}`, input);

export const deleteTransaction = (id: string) => apiDelete(`/transactions/${id}`);

// Compra parcelada: cria N parcelas de uma vez. Devolve {created} (o nº de parcelas criadas).
export const createInstallmentPurchase = (input: CreateInstallmentInput) =>
  apiPost<{ created: number }>('/transactions/installment-purchases', input);

// Recorrência ("Fixo"): registra só a regra (modelo, sem lançar transação). Devolve {created}.
export const createRecurringRule = (input: CreateRecurringRuleInput) =>
  apiPost<{ created: boolean }>('/recurring-rules', input);

// Registra a ocorrência do período corrente de uma recorrência (lança a transação `standard`,
// occurred_on=hoje). Devolve a transação criada. 409 se já registrada no período / fora da janela.
export const registerRecurrence = (id: string) =>
  apiPost<TransactionDetail>(`/recurring-rules/${id}/register`, {});
