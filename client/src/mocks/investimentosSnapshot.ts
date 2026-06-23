import { assessRisk } from '../lib/investmentRisk';
import type {
  AllocationSlice,
  CryptoBlock,
  InvestimentosSnapshot,
  PortfolioSummary,
  Position,
} from '../types/investimentos';

// MOCK ISOLADO da tela de Investimentos. É a ÚNICA parte descartável: src/api/investimentos
// resolve este snapshot enquanto não existe backend. Pra ligar a API real, troque o corpo das
// funções de src/api/investimentos por apiGet('/investimentos/...') e este arquivo vira (ou some
// como) fixture de teste — nenhum componente/hook muda. Valores em centavos (inteiro).
//
// Invariantes mantidas de propósito (cobertas em __tests__/api/investimentos.test.ts):
//   summary.totalCents === Σ allocation[].valueCents === Σ positions[].currentValueCents  (cripto FORA)
//   crypto.subtotalCents === Σ crypto.holdings[].currentValueCents
//   por item: gainCents === currentValueCents - costBasisCents
const summary: PortfolioSummary = {
  totalCents: 250000,
  gainCents: -9400,
  gainPct: -3.62,
  title: 'Portfólio de Ilusões',
  quip: 'Diversificado entre o tombo e o quase-tombo.',
};

const positions: Position[] = [
  {
    id: 'petr4',
    ticker: 'PETR4',
    name: 'Petrobras PN',
    assetClass: 'acoes',
    icon: 'local_gas_station',
    costBasisCents: 50000,
    currentValueCents: 45000,
    gainCents: -5000,
    gainPct: -10.0,
  },
  {
    id: 'vale3',
    ticker: 'VALE3',
    name: 'Vale ON',
    assetClass: 'acoes',
    icon: 'corporate_fare',
    costBasisCents: 36000,
    currentValueCents: 30000,
    gainCents: -6000,
    gainPct: -16.7,
  },
  {
    id: 'mxrf11',
    ticker: 'MXRF11',
    name: 'Maxi Renda FII',
    assetClass: 'fiis',
    icon: 'account_balance',
    costBasisCents: 20400,
    currentValueCents: 20900,
    gainCents: 500,
    gainPct: 2.45,
  },
  {
    id: 'hglg11',
    ticker: 'HGLG11',
    name: 'CSHG Logística FII',
    assetClass: 'fiis',
    icon: 'account_balance',
    costBasisCents: 30000,
    currentValueCents: 29100,
    gainCents: -900,
    gainPct: -3.0,
  },
  {
    id: 'selic2029',
    ticker: 'SELIC29',
    name: 'Tesouro Selic 2029',
    assetClass: 'renda_fixa',
    icon: 'savings',
    costBasisCents: 83000,
    currentValueCents: 84660,
    gainCents: 1660,
    gainPct: 2.0,
  },
  {
    id: 'cdb110',
    ticker: 'CDB',
    name: 'CDB 110% CDI',
    assetClass: 'renda_fixa',
    icon: 'savings',
    costBasisCents: 40000,
    currentValueCents: 40340,
    gainCents: 340,
    gainPct: 0.85,
  },
];

const allocation: AllocationSlice[] = [
  { assetClass: 'acoes', label: 'Ações', valueCents: 75000, percent: 30, tone: 'primary' },
  { assetClass: 'fiis', label: 'FIIs', valueCents: 50000, percent: 20, tone: 'secondary' },
  {
    assetClass: 'renda_fixa',
    label: 'Renda Fixa',
    valueCents: 125000,
    percent: 50,
    tone: 'neutral',
  },
];

const crypto: CryptoBlock = {
  title: 'O Circo da Volatilidade',
  subtitle: '2 ativos no picadeiro',
  subtotalCents: 46965,
  gainCents: 1965,
  gainPct: 4.37,
  holdings: [
    {
      id: 'btc',
      symbol: 'BTC',
      name: 'Bitcoin',
      icon: 'currency_bitcoin',
      costBasisCents: 30000,
      currentValueCents: 34125,
      gainCents: 4125,
      gainPct: 13.75,
      series: [29800, 30500, 30100, 31200, 30900, 32400, 33100, 34125],
    },
    {
      id: 'eth',
      symbol: 'ETH',
      name: 'Ethereum',
      icon: 'currency_bitcoin',
      costBasisCents: 15000,
      currentValueCents: 12840,
      gainCents: -2160,
      gainPct: -14.4,
      series: [15100, 14600, 14800, 14100, 13700, 13900, 13200, 12840],
    },
  ],
};

// Avaliação de Risco = resumo do DESEMPENHO (lucro/perda) geral, incluindo cripto. É derivada
// (não cravada à mão) pelo assessRisk a partir do resultado total — é o que o backend computaria.
const overallGainCents = summary.gainCents + crypto.gainCents;
const overallCostCents =
  summary.totalCents - summary.gainCents + (crypto.subtotalCents - crypto.gainCents);
const overallGainPct = Math.round((overallGainCents / overallCostCents) * 10000) / 100;

export const investimentosSnapshot: InvestimentosSnapshot = {
  summary,
  positions,
  allocation,
  crypto,
  risk: assessRisk(overallGainPct),
};
