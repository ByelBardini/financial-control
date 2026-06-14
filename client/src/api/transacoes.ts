import { apiGet } from './client';
import type { CashflowSummary, FutureDebt, Recurrence, Transaction } from '../types/transacoes';

// Views da tela de Transações, ligadas à API real (mesmo padrão de src/api/contas). O
// backend (domínio transacoes) deriva labels/tag/colapso/notas — o client só renderiza.
// O CRUD de transação vive em /transactions (sem consumidor no client ainda).

export const getCashflowSummary = () => apiGet<CashflowSummary>('/transacoes/summary');

export const getTransactions = () => apiGet<Transaction[]>('/transacoes/list');

export const getRecurrences = () => apiGet<Recurrence[]>('/transacoes/recurrences');

export const getFutureDebts = () => apiGet<FutureDebt[]>('/transacoes/debts');
