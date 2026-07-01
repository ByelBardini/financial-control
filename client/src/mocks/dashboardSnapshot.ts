import type { DashboardSnapshot } from '../types/dashboard';

// FIXTURE DE TESTE — não é usado em runtime (a API real vive em src/api). Serve
// de dado injetado nos testes dos componentes apresentacionais. Todos os valores
// monetários em centavos (inteiro); saldo disponível = receitas − gastos
// (320000 − 191550 = 128450).
export const dashboardSnapshot: DashboardSnapshot = {
  balance: {
    netCents: 128450,
    availableLabel: 'Disponível para gastar',
    statusLabel: 'Sobrevivendo',
    quip: 'Vai dar pra pagar a Netflix. Talvez.',
    receitasCents: 320000,
    gastosCents: 191550,
    investidoCents: 50000,
  },
  accounts: [
    {
      id: 'nubank',
      name: 'Nubank',
      accountType: 'checking',
      balanceCents: 84220,
      icon: 'credit_card',
      tone: 'primary',
      dotColor: '#d0bcff',
    },
    {
      id: 'inter',
      name: 'Inter',
      accountType: 'checking',
      balanceCents: 32000,
      icon: 'account_balance',
      tone: 'neutral',
      dotColor: '#ff7a00',
    },
    {
      id: 'carteira',
      name: 'Carteira',
      accountType: 'cash',
      balanceCents: 12230,
      icon: 'account_balance_wallet',
      tone: 'neutral',
      dotColor: '#958ea0',
    },
    {
      id: 'binance',
      name: 'Binance',
      accountType: 'exchange',
      balanceCents: 145000,
      icon: 'currency_bitcoin',
      tone: 'neutral',
      dotColor: '#f3ba2f',
    },
  ],
  investments: [
    { id: 'btc', name: 'BTC', valueCents: 210000, dailyChangePct: 6.2, icon: 'currency_bitcoin' },
    {
      id: 'cdb',
      name: 'CDB 110% CDI',
      valueCents: 122000,
      dailyChangePct: 1.4,
      icon: 'trending_up',
    },
  ],
  investmentsSummary: { totalCents: 482000, changeCents: 31240, changePct: 8.48 },
  categories: [
    { id: 'alimentacao', label: 'Alimentação', amountCents: 62000, percent: 70, tone: 'primary' },
    { id: 'transporte', label: 'Transporte', amountCents: 21000, percent: 30, tone: 'primary' },
    { id: 'lazer', label: 'Lazer', amountCents: 16000, percent: 20, tone: 'primary' },
    { id: 'assinaturas', label: 'Assinaturas', amountCents: 8500, percent: 10, tone: 'primary' },
  ],
  esteMes: { spentPercent: 59, biggestVillain: 'Alimentação' },
  diagnosis: {
    title: 'Diagnóstico Pobrify',
    body: 'Você ainda não está falido. Continue assim.',
  },
};
