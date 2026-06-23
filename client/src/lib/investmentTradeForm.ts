import type { CreateTradeInput, Trade } from '../types/investimentos';

// Lado da operação: comprar (debita a conta) ou vender (credita a conta). O modal fixa o lado.
export type TradeSide = Trade['side'];

// Valores controlados do form de compra/venda. quantity é STRING decimal (até 8 casas, sem float —
// igual ao backend); preço unitário em centavos; data AAAA-MM-DD; accountId = conta de liquidação.
export type TradeFormValues = {
  side: TradeSide;
  quantity: string;
  unitPriceCents: number;
  tradedOn: string;
  accountId: string;
};

// Valores iniciais. tradedOn = hoje (passado pelo caller p/ testabilidade, igual a
// lib/transactionForm); accountId vazio (o form pré-seleciona a 1ª conta quando a lista carrega).
export function initialTradeValues(side: TradeSide, todayISO: string): TradeFormValues {
  return { side, quantity: '', unitPriceCents: 0, tradedOn: todayISO, accountId: '' };
}

export type TradeFormErrors = {
  quantity?: string;
  unitPrice?: string;
  account?: string;
  date?: string;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// Quantidade: decimal positivo com até 8 casas (espelha quantityRe do server; sem vírgula/negativo).
const QUANTITY_RE = /^\d+(\.\d{1,8})?$/;

// isPositiveDecimal aceita só o formato de QUANTITY_RE E com ao menos um dígito não-zero (rejeita
// "0", "0.00000000"). Sem parse decimal — só checagem de string, igual ao backend.
export function isPositiveDecimal(s: string): boolean {
  return QUANTITY_RE.test(s) && /[1-9]/.test(s);
}

// Validação do client (o server revalida): quantidade decimal positiva, preço > 0, conta escolhida
// e data válida. A guarda de "vender mais do que tem" é do server (400) — o client não a duplica.
export function validateTradeForm(v: TradeFormValues): TradeFormErrors {
  const errors: TradeFormErrors = {};
  if (!isPositiveDecimal(v.quantity.trim())) {
    errors.quantity = 'Informe uma quantidade maior que zero (até 8 casas).';
  }
  if (v.unitPriceCents <= 0) errors.unitPrice = 'Informe um preço maior que zero.';
  if (v.accountId === '') errors.account = 'Escolha a conta de liquidação.';
  if (!DATE_RE.test(v.tradedOn)) errors.date = 'Escolha uma data válida.';
  return errors;
}

// Serializa pro corpo de POST /investimentos/assets/{id}/trades.
export function toCreateTradeInput(v: TradeFormValues): CreateTradeInput {
  return {
    side: v.side,
    quantity: v.quantity.trim(),
    unitPriceCents: v.unitPriceCents,
    tradedOn: v.tradedOn,
    accountId: v.accountId,
  };
}
