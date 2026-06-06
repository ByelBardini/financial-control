import type { IconName } from '../components/Icon';

// Tom semântico que mapeia para as cores do tema (primary/secondary/error)
// e dá um neutro para variações sem direção.
export type Tone = 'primary' | 'secondary' | 'error' | 'neutral';

export interface Account {
  id: string;
  name: string;
  balanceCents: number;
  icon: IconName; // usado no layout mobile
  tone: Tone; // cor do valor no mobile
  dotColor: string; // bolinha de marca no grid do desktop
}

export interface Investment {
  id: string;
  name: string;
  valueCents: number;
  dailyChangePct: number;
  icon: IconName;
}

export interface InvestmentsSummary {
  totalCents: number;
  changeCents: number;
  changePct: number;
}

export interface CategorySpend {
  id: string;
  label: string;
  amountCents: number;
  percent: number;
  tone: Tone;
}

export interface MonthBalance {
  netCents: number;
  availableLabel: string; // "Disponível para gastar"
  statusLabel: string; // "Sobrevivendo"
  quip: string;
  receitasCents: number;
  gastosCents: number;
  investidoCents: number;
}

export interface EsteMes {
  spentPercent: number; // 0..100 da receita gasta
  biggestVillain: string; // categoria que mais pesou
}

export interface Ticker {
  name: string; // "Bitcoin"
  symbol: string; // "B"
  changePct24h: number;
  priceCents: number;
  positionCents: number; // posição do usuário
}

export interface Diagnosis {
  title: string;
  body: string;
}

export interface DashboardSnapshot {
  balance: MonthBalance;
  accounts: Account[];
  investments: Investment[];
  investmentsSummary: InvestmentsSummary;
  categories: CategorySpend[];
  esteMes: EsteMes;
  ticker: Ticker;
  diagnosis: Diagnosis;
}
