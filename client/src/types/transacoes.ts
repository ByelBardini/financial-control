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
// Assinaturas no mobile; category é o rótulo ácido ("Evasão Digital").
export interface Recurrence {
  id: string;
  name: string;
  category: string;
  amountCents: number;
  direction: TransactionDirection;
  icon: IconName;
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

// Snapshot completo: fixture de runtime hoje, shape da futura API de Transações.
export interface TransacoesSnapshot {
  summary: CashflowSummary;
  transactions: Transaction[];
  recurrences: Recurrence[];
  debts: FutureDebt[];
}
