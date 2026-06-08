import type { IconName } from '../components/Icon';
import type { Tone } from './dashboard';

// Modelo da tela de Contas. Reusa o Tone do dashboard; valores monetários sempre
// em centavos inteiros (formatação só na borda, via MoneyText/formatBRL).

// Estado de um vale/benefício, vira pílula colorida (VoucherStatusBadge).
export type VoucherStatus = 'ativo' | 'estavel' | 'critico';

// Conta da seção "Bancos". subtitle = "Conta Corrente • Final 4022"; brandColor
// tinge o tile do ícone (hex da marca); note é a ironia/sync ("Vazio como minha alma").
export interface BankAccount {
  id: string;
  name: string;
  subtitle: string;
  balanceCents: number;
  icon: IconName;
  brandColor: string;
  note: string;
  noteTone: Tone;
}

// Cartão de vale (benefício) com barra de consumo (remainingPercent: 0..100).
export interface Voucher {
  id: string;
  name: string;
  valueCents: number;
  icon: IconName;
  status: VoucherStatus;
  remainingPercent: number;
  note: string;
  noteTone: Tone;
}

// Cartão de crédito da seção "Cartões". invoiceCents = fatura atual (dívida);
// usedPercent (0..100) tinge a barra de uso; availableCents = limite - fatura.
export interface CreditCard {
  id: string;
  name: string;
  invoiceCents: number;
  limitCents: number;
  availableCents: number;
  usedPercent: number;
  icon: IconName;
  brandColor: string;
  note: string;
  noteTone: Tone;
}

// Carteira física (dinheiro em espécie) + medidor de "Confiança Financeira".
export interface CashWallet {
  balanceCents: number;
  quip: string;
  confidenceLabel: string;
  confidencePercent: number;
}

// Linha monetária do "Raio-X de Pobreza" (label + valor colorido pelo tom).
export interface XrayRow {
  label: string;
  cents: number;
  tone: Tone;
}

// Panic Meter: posição 0..100 na barra-gradiente + rótulos de nível/extremos.
export interface PanicMeter {
  percent: number;
  levelLabel: string;
  levelTone: Tone;
  lowLabel: string;
  highLabel: string;
  note: string;
}

// "Raio-X de Pobreza": linhas (dívidas/limite) + Panic Meter.
export interface PovertyXray {
  title: string;
  rows: XrayRow[];
  panic: PanicMeter;
}

// "Dica de Gestão" (título + corpo). Estrutura compatível com DiagnosisCard.
export interface ManagementTip {
  title: string;
  body: string;
}

// Snapshot completo: fixture de teste hoje, shape da futura API de Contas.
export interface ContasSnapshot {
  banks: BankAccount[];
  cards: CreditCard[];
  vouchers: Voucher[];
  cash: CashWallet;
  xray: PovertyXray;
  tip: ManagementTip;
}
