import type { CreateTransferInput } from '../types/transfers';

// Valores controlados do formulário de transferência (valor em centavos; data YYYY-MM-DD).
// description vazia vira undefined no envio (o server aplica o fallback "Transferência").
export type TransferFormValues = {
  originAccountId: string;
  destinationAccountId: string;
  amountCents: number;
  occurredOn: string;
  description: string;
};

// Valores iniciais. occurredOn = hoje (passado pelo caller p/ testabilidade). Origem/destino
// vazios; o caller pode pré-travar o destino (ex.: pagar fatura → conta do cartão).
export function initialTransferValues(todayISO: string): TransferFormValues {
  return {
    originAccountId: '',
    destinationAccountId: '',
    amountCents: 0,
    occurredOn: todayISO,
    description: '',
  };
}

export type TransferFormErrors = {
  origin?: string;
  destination?: string;
  amount?: string;
  date?: string;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Validação do client (o server revalida): origem e destino escolhidos e DIFERENTES, valor > 0
// e data no formato YYYY-MM-DD. A posse das contas é garantida no server.
export function validateTransferForm(v: TransferFormValues): TransferFormErrors {
  const errors: TransferFormErrors = {};
  if (v.originAccountId === '') errors.origin = 'Escolha a conta de origem.';
  if (v.destinationAccountId === '') errors.destination = 'Escolha a conta de destino.';
  if (v.originAccountId !== '' && v.originAccountId === v.destinationAccountId) {
    errors.destination = 'Origem e destino devem ser diferentes.';
  }
  if (v.amountCents <= 0) errors.amount = 'Informe um valor maior que zero.';
  if (!DATE_RE.test(v.occurredOn)) errors.date = 'Escolha uma data válida.';
  return errors;
}

// Serializa pro corpo da API. description vazia (após trim) vira undefined.
export function toCreateTransferInput(v: TransferFormValues): CreateTransferInput {
  const description = v.description.trim();
  return {
    originAccountId: v.originAccountId,
    destinationAccountId: v.destinationAccountId,
    amountCents: v.amountCents,
    occurredOn: v.occurredOn,
    ...(description === '' ? {} : { description }),
  };
}
