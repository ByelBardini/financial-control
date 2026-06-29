import type { PatrimonioOverview } from '../types/patrimonio';

// FIXTURE DE TESTE — não é usado em runtime (a API real vive em src/api). Injetado nos
// testes do herói/telas. Centavos (inteiro). Invariante: liquidBalanceCents = bank + cash
// (312230 = 300000 + 12230). investedCents bate com o investmentsSummary.totalCents do
// dashboardSnapshot (482000) de propósito — prova a conciliação Início × Investimentos.
export const patrimonioSnapshot: PatrimonioOverview = {
  liquidBalanceCents: 312230,
  bankCents: 300000,
  cashCents: 12230,
  investedCents: 482000,
  cryptoCents: 210000,
  cardDebtCents: 32000,
  voucherCents: 21500,
};
