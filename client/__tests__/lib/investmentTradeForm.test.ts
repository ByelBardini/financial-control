import {
  initialTradeValues,
  isPositiveDecimal,
  toCreateTradeInput,
  validateTradeForm,
  type TradeFormValues,
} from '../../src/lib/investmentTradeForm';

const valid: TradeFormValues = {
  side: 'buy',
  quantity: '10.5',
  unitPriceCents: 1000,
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

describe('initialTradeValues', () => {
  it('parte do lado dado, conta vazia e a data de hoje (injetada)', () => {
    const v = initialTradeValues('sell', '2026-06-19');
    expect(v).toEqual({
      side: 'sell',
      quantity: '',
      unitPriceCents: 0,
      tradedOn: '2026-06-19',
      accountId: '',
    });
  });
});

describe('validateTradeForm', () => {
  it('sem erros quando tudo é válido', () => {
    expect(validateTradeForm(valid)).toEqual({});
  });

  it('cobra quantidade positiva', () => {
    expect(validateTradeForm({ ...valid, quantity: '0' }).quantity).toBeDefined();
    expect(validateTradeForm({ ...valid, quantity: '' }).quantity).toBeDefined();
  });

  it('cobra preço maior que zero', () => {
    expect(validateTradeForm({ ...valid, unitPriceCents: 0 }).unitPrice).toBeDefined();
  });

  it('cobra a conta de liquidação', () => {
    expect(validateTradeForm({ ...valid, accountId: '' }).account).toBeDefined();
  });

  it('cobra data no formato AAAA-MM-DD', () => {
    expect(validateTradeForm({ ...valid, tradedOn: '19/06/2026' }).date).toBeDefined();
  });
});

describe('toCreateTradeInput', () => {
  it('serializa o corpo (quantidade trim, sem campos extras)', () => {
    expect(toCreateTradeInput({ ...valid, quantity: ' 10.5 ' })).toEqual({
      side: 'buy',
      quantity: '10.5',
      unitPriceCents: 1000,
      tradedOn: '2026-06-19',
      accountId: 'acc-1',
    });
  });
});
