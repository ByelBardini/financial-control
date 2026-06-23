import {
  deriveQuantityFromValue,
  initialTradeValues,
  isPositiveDecimal,
  resolveQuantity,
  toCreateTradeInput,
  validateTradeForm,
  type TradeFormValues,
} from '../../src/lib/investmentTradeForm';

const byQuantity: TradeFormValues = {
  side: 'buy',
  mode: 'quantity',
  quantity: '10.5',
  amountCents: 0,
  unitPriceCents: 1000,
  tradedOn: '2026-06-19',
  accountId: 'acc-1',
};

const byValue: TradeFormValues = {
  side: 'buy',
  mode: 'value',
  quantity: '',
  amountCents: 10000, // R$ 100,00
  unitPriceCents: 30000000, // BTC a R$ 300.000,00
  tradedOn: '2026-06-19',
  accountId: 'acc-1',
};

describe('isPositiveDecimal (espelha o backend)', () => {
  it.each(['1', '10.5', '0.00000001', '999999'])('aceita %s', (s) => {
    expect(isPositiveDecimal(s)).toBe(true);
  });

  it.each(['0', '0.00000000', '-1', '1,5', '1.123456789', 'abc', '', '.5'])('rejeita %s', (s) => {
    expect(isPositiveDecimal(s)).toBe(false);
  });
});

describe('deriveQuantityFromValue', () => {
  it('R$100 a R$300.000 → 0.00033333 (8 casas)', () => {
    expect(deriveQuantityFromValue(10000, 30000000)).toBe('0.00033333');
  });

  it('tira zeros à direita (R$50 a R$100 → "0.5")', () => {
    expect(deriveQuantityFromValue(5000, 10000)).toBe('0.5');
  });

  it('inteiro puro sem casas (R$200 a R$100 → "2")', () => {
    expect(deriveQuantityFromValue(20000, 10000)).toBe('2');
  });

  it('vazio quando preço ou valor ≤ 0', () => {
    expect(deriveQuantityFromValue(10000, 0)).toBe('');
    expect(deriveQuantityFromValue(0, 10000)).toBe('');
  });
});

describe('initialTradeValues', () => {
  it('cripto abre em "valor" com o preço do ativo pré-preenchido', () => {
    expect(initialTradeValues('buy', '2026-06-19', 30000000, true)).toEqual({
      side: 'buy',
      mode: 'value',
      quantity: '',
      amountCents: 0,
      unitPriceCents: 30000000,
      tradedOn: '2026-06-19',
      accountId: '',
    });
  });

  it('não-cripto abre em "quantidade"', () => {
    expect(initialTradeValues('sell', '2026-06-19', 5000, false).mode).toBe('quantity');
  });
});

describe('resolveQuantity', () => {
  it('modo quantidade usa a quantidade digitada (com trim)', () => {
    expect(resolveQuantity({ ...byQuantity, quantity: ' 10.5 ' })).toBe('10.5');
  });

  it('modo valor deriva a quantidade do valor ÷ preço', () => {
    expect(resolveQuantity(byValue)).toBe('0.00033333');
  });
});

describe('validateTradeForm', () => {
  it('sem erros quando válido (quantidade)', () => {
    expect(validateTradeForm(byQuantity)).toEqual({});
  });

  it('sem erros quando válido (valor)', () => {
    expect(validateTradeForm(byValue)).toEqual({});
  });

  it('modo quantidade cobra quantidade positiva', () => {
    expect(validateTradeForm({ ...byQuantity, quantity: '0' }).quantity).toBeDefined();
  });

  it('modo valor cobra valor maior que zero', () => {
    expect(validateTradeForm({ ...byValue, amountCents: 0 }).amount).toBeDefined();
  });

  it('modo valor acusa valor pequeno demais pro preço (qtd derivada zera nas 8 casas)', () => {
    // R$0,01 a R$3.000.000 → 0.0000000033 → arredonda a 8 casas pra zero.
    expect(validateTradeForm({ ...byValue, amountCents: 1, unitPriceCents: 300000000 }).amount).toBeDefined();
  });

  it('cobra preço maior que zero em ambos os modos', () => {
    expect(validateTradeForm({ ...byQuantity, unitPriceCents: 0 }).unitPrice).toBeDefined();
    expect(validateTradeForm({ ...byValue, unitPriceCents: 0 }).unitPrice).toBeDefined();
  });

  it('cobra a conta de liquidação e a data', () => {
    expect(validateTradeForm({ ...byQuantity, accountId: '' }).account).toBeDefined();
    expect(validateTradeForm({ ...byQuantity, tradedOn: '19/06/2026' }).date).toBeDefined();
  });
});

describe('toCreateTradeInput', () => {
  it('modo quantidade serializa a quantidade digitada', () => {
    expect(toCreateTradeInput(byQuantity)).toEqual({
      side: 'buy',
      quantity: '10.5',
      unitPriceCents: 1000,
      tradedOn: '2026-06-19',
      accountId: 'acc-1',
    });
  });

  it('modo valor serializa a quantidade DERIVADA (não o valor)', () => {
    expect(toCreateTradeInput(byValue)).toEqual({
      side: 'buy',
      quantity: '0.00033333',
      unitPriceCents: 30000000,
      tradedOn: '2026-06-19',
      accountId: 'acc-1',
    });
  });
});
