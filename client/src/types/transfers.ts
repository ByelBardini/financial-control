// Modelo da transferência entre contas (dupla entrada no server). Valores em centavos.
// "Pagar fatura" de cartão usa a mesma transferência com destinationAccountId = a conta credit_card.

// Corpo de criação. description opcional — o server aplica o fallback "Transferência".
export interface CreateTransferInput {
  originAccountId: string;
  destinationAccountId: string;
  description?: string;
  amountCents: number;
  occurredOn: string;
}

// Resultado (201): o group id do par + o eco dos campos enviados.
export interface TransferResult {
  groupId: string;
  originAccountId: string;
  destinationAccountId: string;
  amountCents: number;
  occurredOn: string;
}
