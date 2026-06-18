import type { IconName } from '../components/Icon';
import type { Tone } from './dashboard';
import type { PanicMeter } from './contas';

// Modelo da tela de Transações. Reusa o Tone do dashboard e o PanicMeter de Contas;
// valores monetários sempre em centavos inteiros (formatação só na borda via
// MoneyText/formatBRL). Hoje servido por mock; o shape já é o da futura API.

// Sentido do dinheiro: entra (inflow, verde/secondary) ou sai (outflow, vermelho/error).
export type TransactionDirection = 'inflow' | 'outflow';

// Item do log de transações. amountCents é a magnitude (sempre positiva); o sinal
// e o tom saem de direction. dateLabel = "12 OUT"; timeLabel = "12:45"/"Ontem"/"02 Nov".
// tag é a etiqueta ácida ("Sobrevivência") tingida por tagTone.
export interface Transaction {
  id: string;
  dateLabel: string;
  timeLabel: string;
  title: string;
  accountLabel: string;
  category: string;
  tag: string;
  tagTone: Tone;
  amountCents: number;
  direction: TransactionDirection;
  icon: IconName;
}

// Fluxo de caixa do período: entradas (Esperança), saídas (Realidade) e o saldo
// líquido (Net Burn, negativo quando se gasta mais que se ganha). burnPercent (0..100)
// preenche a barra do Net Burn; collapse reusa o PanicMeter ("Previsão de Colapso").
export interface CashflowSummary {
  inflowCents: number;
  outflowCents: number;
  netBurnCents: number;
  burnPercent: number;
  collapse: PanicMeter;
}

// Receita ou despesa recorrente (Salário, Netflix...). direction separa Receitas de
// Assinaturas no mobile; category é o rótulo ácido ("Evasão Digital"). isDue: a ocorrência do
// período corrente ainda não foi registrada → a linha mostra o botão "Registrar".
export interface Recurrence {
  id: string;
  name: string;
  category: string;
  amountCents: number;
  direction: TransactionDirection;
  icon: IconName;
  isDue: boolean;
}

// Dívida futura/parcelada. installmentLabel = "Parcela 04/12" ou "Próx. 5 dias";
// percent (0..100) é o progresso da barra (tingida por tone); note é a ironia opcional.
export interface FutureDebt {
  id: string;
  label: string;
  installmentLabel: string;
  amountCents: number;
  percent: number;
  tone: Tone;
  icon: IconName;
  note?: string;
}

// Período do filtro de tempo da lista. '30d' (default) / '3m' / '6m' / '1y' recuam a
// partir de hoje; 'custom' usa from/to (YYYY-MM-DD).
export type TransactionPeriod = '30d' | '3m' | '6m' | '1y' | 'custom';

// Filtros da lista (combinam AND no server; categoryIds em OR entre si). categoryIds vazio
// = todas; query "" = sem busca; from/to só valem quando period === 'custom'.
export interface TransactionFilters {
  period: TransactionPeriod;
  categoryIds: string[];
  query: string;
  from: string;
  to: string;
}

// Página do log de transações + metadados de paginação (envelope de GET /transacoes/list).
export interface TransactionPage {
  items: Transaction[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
}

// Categoria do usuário — alimenta o filtro de categoria.
export interface Category {
  id: string;
  name: string;
  icon: IconName;
  kind: 'income' | 'expense';
}

// Recurso transação devolvido por criar/editar/GET (campos crus + presentação). 1:1 com o
// TransactionDetail do server; usado pra pré-preencher a edição.
export interface TransactionDetail {
  id: string;
  accountId: string;
  categoryId: string; // '' = sem categoria
  description: string;
  direction: TransactionDirection;
  amountCents: number;
  occurredOn: string; // YYYY-MM-DD
  accountLabel: string;
  category: string;
  icon: IconName;
}

// Corpo de criação de transação. categoryId null = sem categoria.
export interface CreateTransactionInput {
  accountId: string;
  categoryId: string | null;
  description: string;
  direction: TransactionDirection;
  amountCents: number;
  occurredOn: string; // YYYY-MM-DD
}

// Corpo de edição — igual ao Create menos accountId (a edição não troca de conta).
export type UpdateTransactionInput = Omit<CreateTransactionInput, 'accountId'>;

// Corpo de criação de uma compra PARCELADA. amountCents é o valor de UMA parcela; o server
// cria N linhas (kind='installment') datadas mês a mês a partir de occurredOn. Sempre despesa.
export interface CreateInstallmentInput {
  accountId: string;
  categoryId: string | null;
  description: string;
  amountCents: number; // por parcela
  totalInstallments: number;
  occurredOn: string; // YYYY-MM-DD (1ª parcela)
}

// Frequência de uma regra de recorrência (transação Fixa).
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

// Corpo de criação de uma regra de recorrência ("Fixo"). O server registra a regra E lança a
// transação do período atual (startDate). Fim opcional e EXCLUSIVO: endDate OU maxOccurrences
// (nunca os dois; ambos null = permanente).
export interface CreateRecurringRuleInput {
  accountId: string;
  categoryId: string | null;
  description: string;
  direction: TransactionDirection;
  amountCents: number;
  frequency: RecurrenceFrequency;
  intervalCount: number;
  startDate: string; // YYYY-MM-DD
  endDate: string | null;
  maxOccurrences: number | null;
}

// Snapshot completo: fixture de teste (summary/recurrences/debts) + a lista no shape antigo.
export interface TransacoesSnapshot {
  summary: CashflowSummary;
  transactions: Transaction[];
  recurrences: Recurrence[];
  debts: FutureDebt[];
}
