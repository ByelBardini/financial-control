import * as labels from '../../src/lib/moneyLabels';

describe('moneyLabels', () => {
  it('fixa as strings exatas do glossário monetário (estoque)', () => {
    expect(labels.LIQUID_BALANCE).toBe('Saldo líquido');
    expect(labels.BANK_SUBTOTAL).toBe('Em bancos');
    expect(labels.CASH_SUBTOTAL).toBe('Em espécie');
    expect(labels.ASSETS_TOTAL).toBe('Patrimônio em ativos');
    expect(labels.CRYPTO_SUBTOTAL).toBe('Subtotal em cripto');
    expect(labels.CARD_DEBT).toBe('Fatura no cartão');
    expect(labels.VOUCHERS).toBe('Vales');
  });

  it('fixa as strings exatas do glossário monetário (fluxo do mês)', () => {
    expect(labels.MONTH_INCOME).toBe('Receitas do mês');
    expect(labels.MONTH_EXPENSE).toBe('Gastos do mês');
    expect(labels.MONTH_RESULT).toBe('Resultado do mês');
  });
});
