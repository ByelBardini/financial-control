import type { CreateTradeInput, Trade } from '../types/investimentos';

// Lado da operação: comprar (debita a conta) ou vender (credita a conta). O modal fixa o lado.
export type TradeSide = Trade['side'];

// Como o usuário informa a operação: pela QUANTIDADE (digita qtd, o total sai do preço) ou pelo
// VALOR em R$ (digita quanto investir/resgatar, a quantidade sai do preço — só faz sentido p/ cripto).
export type TradeInputMode = 'quantity' | 'value';

// Valores controlados do form de compra/venda. `mode` decide qual campo é o input e qual é derivado;
// `quantity` (string decimal até 8 casas) é o input no modo quantidade; `amountCents` é o input no
// modo valor; `unitPriceCents` (centavos) vem do preço do ativo, pré-preenchido e EDITÁVEL; data
// AAAA-MM-DD; accountId = conta de liquidação.
export type TradeFormValues = {
  side: TradeSide;
  mode: TradeInputMode;
  quantity: string;
  amountCents: number;
  unitPriceCents: number;
  tradedOn: string;
  accountId: string;
};

// Valores iniciais. `mode` abre em 'value' p/ cripto (padrão dos apps de cripto: "investir R$X") e
// em 'quantity' p/ o resto; `unitPriceCents` vem do preço atual do ativo (caller); data = hoje
// (passada pelo caller p/ testabilidade); accountId vazio (o form pré-seleciona a 1ª conta).
export function initialTradeValues(
  side: TradeSide,
  todayISO: string,
  unitPriceCents: number,
  isCrypto: boolean,
): TradeFormValues {
  return {
    side,
    mode: isCrypto ? 'value' : 'quantity',
    quantity: '',
    amountCents: 0,
    unitPriceCents,
    tradedOn: todayISO,
    accountId: '',
  };
}

export type TradeFormErrors = {
  quantity?: string;
  amount?: string;
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

// trimDecimal remove zeros à direita (e o ponto solto) de uma string decimal: "0.50000000"→"0.5".
function trimDecimal(s: string): string {
  return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
}

// deriveQuantityFromValue calcula a quantidade a partir do valor em R$: qtd = valor / preço. Como
// ambos estão em centavos, o /100 cancela (amountCents / unitPriceCents). Arredonda a 8 casas (limite
// do server) e tira zeros à direita. Vazio quando não dá pra dividir (preço/valor ≤ 0). Só DERIVA a
// string — o dinheiro de verdade (qtd × preço) é NUMERIC no SQL.
export function deriveQuantityFromValue(amountCents: number, unitPriceCents: number): string {
  if (amountCents <= 0 || unitPriceCents <= 0) return '';
  return trimDecimal((amountCents / unitPriceCents).toFixed(8));
}

// resolveQuantity devolve a quantidade canônica a submeter conforme o modo (digitada no modo
// quantidade, derivada do valor no modo valor).
export function resolveQuantity(v: TradeFormValues): string {
  return v.mode === 'value'
    ? deriveQuantityFromValue(v.amountCents, v.unitPriceCents)
    : v.quantity.trim();
}

// Validação do client (o server revalida): preço > 0 sempre; no modo valor cobra valor > 0 (e que a
// quantidade derivada não seja zero pra esse preço); no modo quantidade cobra quantidade decimal
// positiva. Conta escolhida e data válida em ambos. A guarda de "vender mais do que tem" é do server.
export function validateTradeForm(v: TradeFormValues): TradeFormErrors {
  const errors: TradeFormErrors = {};
  if (v.unitPriceCents <= 0) errors.unitPrice = 'Informe um preço maior que zero.';
  if (v.mode === 'value') {
    if (v.amountCents <= 0) errors.amount = 'Informe um valor maior que zero.';
    else if (v.unitPriceCents > 0 && !isPositiveDecimal(resolveQuantity(v))) {
      errors.amount = 'Valor pequeno demais para esse preço.';
    }
  } else if (!isPositiveDecimal(v.quantity.trim())) {
    errors.quantity = 'Informe uma quantidade maior que zero (até 8 casas).';
  }
  if (v.accountId === '') errors.account = 'Escolha a conta de liquidação.';
  if (!DATE_RE.test(v.tradedOn)) errors.date = 'Escolha uma data válida.';
  return errors;
}

// Serializa pro corpo de POST /investimentos/assets/{id}/trades (sempre quantity + unitPriceCents —
// o modo valor já virou quantidade aqui).
export function toCreateTradeInput(v: TradeFormValues): CreateTradeInput {
  return {
    side: v.side,
    quantity: resolveQuantity(v),
    unitPriceCents: v.unitPriceCents,
    tradedOn: v.tradedOn,
    accountId: v.accountId,
  };
}
