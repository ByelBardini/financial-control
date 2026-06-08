import { apiDelete, apiGet, apiPatch, apiPost } from './client';
import type { AccountDetail, NewAccountInput, UpdateAccountInput } from '../types/accounts';

// Recurso "conta" (CRUD), separado das views agregadas em src/api/contas. Toda
// chamada passa pelo client.ts (Bearer anexado). Dinheiro em centavos inteiros.

export const getAccount = (id: string) => apiGet<AccountDetail>(`/accounts/${id}`);

export const createAccount = (input: NewAccountInput) => apiPost<AccountDetail>('/accounts', input);

export const updateAccount = (id: string, input: UpdateAccountInput) =>
  apiPatch<AccountDetail>(`/accounts/${id}`, input);

export const archiveAccount = (id: string) => apiDelete(`/accounts/${id}`);
