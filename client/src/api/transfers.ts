import { apiPost } from './client';
import type { CreateTransferInput, TransferResult } from '../types/transfers';

// Transferência entre contas (dupla entrada no server). "Pagar fatura" de cartão usa esta
// mesma chamada com destinationAccountId = a conta credit_card. Dinheiro em centavos.

export const createTransfer = (input: CreateTransferInput) =>
  apiPost<TransferResult>('/transfers', input);
