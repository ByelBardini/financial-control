import { transacoesSnapshot } from '../mocks/transacoesSnapshot';
import type { CashflowSummary, FutureDebt, Recurrence, Transaction } from '../types/transacoes';

// Views da tela de Transações. Ainda SEM backend: cada função resolve a fatia do
// fixture (Promise.resolve), mantendo o mesmo contrato assíncrono de api/contas — os
// hooks/QuerySection não enxergam diferença. Flip pro server depois = trocar o corpo
// por apiGet('/transacoes/...'), sem tocar nos hooks nem nas telas.

export const getCashflowSummary = (): Promise<CashflowSummary> =>
  Promise.resolve(transacoesSnapshot.summary);

export const getTransactions = (): Promise<Transaction[]> =>
  Promise.resolve(transacoesSnapshot.transactions);

export const getRecurrences = (): Promise<Recurrence[]> =>
  Promise.resolve(transacoesSnapshot.recurrences);

export const getFutureDebts = (): Promise<FutureDebt[]> =>
  Promise.resolve(transacoesSnapshot.debts);
