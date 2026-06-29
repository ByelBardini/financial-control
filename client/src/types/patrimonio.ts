// Visão "quanto eu tenho hoje" — 1:1 com o DTO Go patrimonio.Overview. O líquido é
// bankCents + cashCents; investido/cripto/cartão/vales ficam À PARTE (não somam no líquido).
// Monetário em centavos inteiros (ver money.md).
export interface PatrimonioOverview {
  liquidBalanceCents: number;
  bankCents: number;
  cashCents: number;
  investedCents: number;
  cryptoCents: number;
  cardDebtCents: number;
  voucherCents: number;
}
