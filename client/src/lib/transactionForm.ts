import type {
  CreateInstallmentInput,
  CreateRecurringRuleInput,
  CreateTransactionInput,
  RecurrenceFrequency,
  TransactionDetail,
  TransactionDirection,
  UpdateTransactionInput,
} from '../types/transacoes';

// Tipo do lançamento: 'unico' (avulso), 'parcelado' (N parcelas) ou 'fixo' (recorrente).
export type TransactionEntryKind = 'unico' | 'parcelado' | 'fixo';

// Como a recorrência termina: nunca (forever), até uma data (until) ou após N vezes (count).
export type RecurrenceEndMode = 'forever' | 'until' | 'count';

// Mínimo de parcelas / repetições (1 = transação única, não recorrência). Espelha o server.
export const MIN_INSTALLMENTS = 2;
export const MIN_OCCURRENCES = 2;

// Valores controlados do formulário de transação (valor em centavos; data YYYY-MM-DD;
// categoryId '' = sem categoria). No 'parcelado', amountCents é o valor POR parcela e
// installmentCount o nº de parcelas. No 'fixo', occurredOn é o início e frequency/endMode/
// endDate/occurrences descrevem a recorrência. Espelha o padrão de lib/accountForm.ts.
export type TransactionFormValues = {
  entryKind: TransactionEntryKind;
  amountCents: number;
  direction: TransactionDirection;
  accountId: string;
  categoryId: string;
  description: string;
  occurredOn: string;
  installmentCount: number;
  frequency: RecurrenceFrequency;
  endMode: RecurrenceEndMode;
  endDate: string;
  occurrences: number;
};

// Valores iniciais da criação. occurredOn = hoje (passado pelo caller p/ testabilidade);
// accountId fica vazio (o form pré-seleciona a 1ª conta quando a lista carrega).
export function initialValues(todayISO: string): TransactionFormValues {
  return {
    entryKind: 'unico',
    amountCents: 0,
    direction: 'outflow',
    accountId: '',
    categoryId: '',
    description: '',
    occurredOn: todayISO,
    installmentCount: MIN_INSTALLMENTS,
    frequency: 'monthly',
    endMode: 'forever',
    endDate: '',
    occurrences: 12,
  };
}

export type TransactionFormErrors = {
  amount?: string;
  account?: string;
  description?: string;
  date?: string;
  installments?: string;
  endDate?: string;
  occurrences?: string;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Validação do client (o server revalida): valor > 0, conta escolhida e data no formato
// YYYY-MM-DD. Categoria e descrição são opcionais (descrição vazia ganha um fallback no envio —
// ver descOrDefault). Parcelado exige nº de parcelas ≥ 2; fixo com fim "até data" exige data
// válida e com fim "N vezes" exige repetições ≥ 2.
export function validateTransactionForm(v: TransactionFormValues): TransactionFormErrors {
  const errors: TransactionFormErrors = {};
  if (v.amountCents <= 0) errors.amount = 'Informe um valor maior que zero.';
  if (v.accountId === '') errors.account = 'Escolha uma conta.';
  if (!DATE_RE.test(v.occurredOn)) errors.date = 'Escolha uma data válida.';
  if (v.entryKind === 'parcelado' && v.installmentCount < MIN_INSTALLMENTS) {
    errors.installments = `Mínimo de ${MIN_INSTALLMENTS} parcelas.`;
  }
  if (v.entryKind === 'fixo' && v.endMode === 'until' && !DATE_RE.test(v.endDate)) {
    errors.endDate = 'Escolha a data de término.';
  }
  if (v.entryKind === 'fixo' && v.endMode === 'count' && v.occurrences < MIN_OCCURRENCES) {
    errors.occurrences = `Mínimo de ${MIN_OCCURRENCES} repetições.`;
  }
  return errors;
}

// Descrição é opcional: vazia cai no rótulo do sentido (o banco exige texto não-vazio, então
// nunca enviamos string vazia). "Despesa" pra saída, "Receita" pra entrada.
function descOrDefault(v: TransactionFormValues): string {
  const d = v.description.trim();
  if (d !== '') return d;
  return v.direction === 'inflow' ? 'Receita' : 'Despesa';
}

// Campos comuns ao create/update (categoryId vazio vira null = sem categoria).
function shared(v: TransactionFormValues) {
  return {
    categoryId: v.categoryId.trim() === '' ? null : v.categoryId,
    description: descOrDefault(v),
    direction: v.direction,
    amountCents: v.amountCents,
    occurredOn: v.occurredOn,
  };
}

export function toCreateInput(v: TransactionFormValues): CreateTransactionInput {
  return { accountId: v.accountId, ...shared(v) };
}

// Edição não envia accountId (o server não troca de conta).
export function toUpdateInput(v: TransactionFormValues): UpdateTransactionInput {
  return shared(v);
}

// Compra parcelada: amountCents é o valor por parcela; o server cria N linhas. Sempre despesa
// (o server fixa direction='expense'), então não enviamos direction.
export function toInstallmentInput(v: TransactionFormValues): CreateInstallmentInput {
  return {
    accountId: v.accountId,
    categoryId: v.categoryId.trim() === '' ? null : v.categoryId,
    description: descOrDefault(v),
    amountCents: v.amountCents,
    totalInstallments: v.installmentCount,
    occurredOn: v.occurredOn,
  };
}

// Recorrência ("Fixo"): occurredOn vira o início; o fim sai do endMode (endDate XOR
// maxOccurrences, ambos null = permanente). intervalCount fixo em 1 (a cada 1 período).
export function toRecurringRuleInput(v: TransactionFormValues): CreateRecurringRuleInput {
  return {
    accountId: v.accountId,
    categoryId: v.categoryId.trim() === '' ? null : v.categoryId,
    description: descOrDefault(v),
    direction: v.direction,
    amountCents: v.amountCents,
    frequency: v.frequency,
    intervalCount: 1,
    startDate: v.occurredOn,
    endDate: v.endMode === 'until' ? v.endDate : null,
    maxOccurrences: v.endMode === 'count' ? v.occurrences : null,
  };
}

// Pré-preenche o form a partir do detalhe da transação (edição — sempre 'unico').
export function detailToFormValues(d: TransactionDetail): TransactionFormValues {
  return {
    entryKind: 'unico',
    amountCents: d.amountCents,
    direction: d.direction,
    accountId: d.accountId,
    categoryId: d.categoryId,
    description: d.description,
    occurredOn: d.occurredOn,
    installmentCount: MIN_INSTALLMENTS,
    frequency: 'monthly',
    endMode: 'forever',
    endDate: '',
    occurrences: 12,
  };
}
