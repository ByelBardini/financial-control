import {
  detailToFormValues,
  initialValues,
  toCreateInput,
  toInstallmentInput,
  toRecurringRuleInput,
  toUpdateInput,
  validateTransactionForm,
  type TransactionFormValues,
} from '../../src/lib/transactionForm';
import type { TransactionDetail } from '../../src/types/transacoes';

const valid: TransactionFormValues = {
  entryKind: 'unico',
  amountCents: 5000,
  direction: 'outflow',
  accountId: 'a1',
  categoryId: 'c1',
  description: 'Mercado',
  occurredOn: '2026-06-12',
  installmentCount: 2,
  frequency: 'monthly',
  endMode: 'forever',
  endDate: '',
  occurrences: 12,
};

describe('initialValues', () => {
  it('começa único, em despesa, hoje, sem conta/categoria/valor', () => {
    expect(initialValues('2026-06-12')).toEqual({
      entryKind: 'unico',
      amountCents: 0,
      direction: 'outflow',
      accountId: '',
      categoryId: '',
      description: '',
      occurredOn: '2026-06-12',
      installmentCount: 2,
      frequency: 'monthly',
      endMode: 'forever',
      endDate: '',
      occurrences: 12,
    });
  });
});

describe('validateTransactionForm', () => {
  it('form válido → sem erros', () => {
    expect(validateTransactionForm(valid)).toEqual({});
  });

  it('pega valor zero, conta vazia e data inválida — mas descrição em branco NÃO é erro', () => {
    const errs = validateTransactionForm({
      ...valid,
      amountCents: 0,
      accountId: '',
      description: '   ',
      occurredOn: '12/06/2026',
    });
    expect(errs.amount).toBeDefined();
    expect(errs.account).toBeDefined();
    expect(errs.date).toBeDefined();
    expect(errs.description).toBeUndefined(); // descrição é opcional agora
  });

  it('valor negativo também é inválido; categoria vazia é ok', () => {
    const errs = validateTransactionForm({ ...valid, amountCents: -100, categoryId: '' });
    expect(errs.amount).toBeDefined();
    expect(errs.account).toBeUndefined();
  });

  it('parcelado exige nº de parcelas ≥ 2', () => {
    expect(
      validateTransactionForm({ ...valid, entryKind: 'parcelado', installmentCount: 1 })
        .installments,
    ).toBeDefined();
    expect(
      validateTransactionForm({ ...valid, entryKind: 'parcelado', installmentCount: 3 })
        .installments,
    ).toBeUndefined();
    // No 'unico', installmentCount baixo não atrapalha.
    expect(
      validateTransactionForm({ ...valid, entryKind: 'unico', installmentCount: 1 }).installments,
    ).toBeUndefined();
  });

  it('fixo "até data" exige data; "N vezes" exige repetições ≥ 2; "indefinido" não exige nada', () => {
    const base = { ...valid, entryKind: 'fixo' as const };
    expect(
      validateTransactionForm({ ...base, endMode: 'until', endDate: '' }).endDate,
    ).toBeDefined();
    expect(
      validateTransactionForm({ ...base, endMode: 'until', endDate: '2026-12-01' }).endDate,
    ).toBeUndefined();
    expect(
      validateTransactionForm({ ...base, endMode: 'count', occurrences: 1 }).occurrences,
    ).toBeDefined();
    expect(
      validateTransactionForm({ ...base, endMode: 'count', occurrences: 6 }).occurrences,
    ).toBeUndefined();
    expect(validateTransactionForm({ ...base, endMode: 'forever' })).toEqual({});
  });
});

describe('toCreateInput / toUpdateInput', () => {
  it('create inclui accountId; categoria vazia vira null; descrição trim', () => {
    expect(toCreateInput({ ...valid, categoryId: '  ', description: '  Mercado  ' })).toEqual({
      accountId: 'a1',
      categoryId: null,
      description: 'Mercado',
      direction: 'outflow',
      amountCents: 5000,
      occurredOn: '2026-06-12',
    });
  });

  it('descrição vazia cai no rótulo do sentido (Despesa/Receita) em todos os mappers', () => {
    expect(toCreateInput({ ...valid, description: '   ', direction: 'outflow' }).description).toBe(
      'Despesa',
    );
    expect(toCreateInput({ ...valid, description: '', direction: 'inflow' }).description).toBe(
      'Receita',
    );
    expect(
      toInstallmentInput({ ...valid, description: '  ', direction: 'outflow' }).description,
    ).toBe('Despesa');
    expect(
      toRecurringRuleInput({ ...valid, description: '', direction: 'inflow' }).description,
    ).toBe('Receita');
  });

  it('update não envia accountId', () => {
    const out = toUpdateInput(valid);
    expect(out).toEqual({
      categoryId: 'c1',
      description: 'Mercado',
      direction: 'outflow',
      amountCents: 5000,
      occurredOn: '2026-06-12',
    });
    expect('accountId' in out).toBe(false);
  });

  it('toInstallmentInput: valor por parcela + nº de parcelas, sem direction, categoria vazia → null', () => {
    const out = toInstallmentInput({
      ...valid,
      entryKind: 'parcelado',
      amountCents: 30000,
      installmentCount: 3,
      categoryId: '  ',
      description: '  Notebook  ',
    });
    expect(out).toEqual({
      accountId: 'a1',
      categoryId: null,
      description: 'Notebook',
      amountCents: 30000,
      totalInstallments: 3,
      occurredOn: '2026-06-12',
    });
    expect('direction' in out).toBe(false);
  });

  it('toRecurringRuleInput: início = occurredOn; "N vezes" → maxOccurrences (endDate null)', () => {
    const out = toRecurringRuleInput({
      ...valid,
      entryKind: 'fixo',
      direction: 'inflow',
      amountCents: 320000,
      frequency: 'monthly',
      endMode: 'count',
      occurrences: 6,
    });
    expect(out).toEqual({
      accountId: 'a1',
      categoryId: 'c1',
      description: 'Mercado',
      direction: 'inflow',
      amountCents: 320000,
      frequency: 'monthly',
      intervalCount: 1,
      startDate: '2026-06-12',
      endDate: null,
      maxOccurrences: 6,
    });
  });

  it('toRecurringRuleInput: "até data" → endDate (maxOccurrences null); "indefinido" → ambos null', () => {
    const until = toRecurringRuleInput({
      ...valid,
      entryKind: 'fixo',
      endMode: 'until',
      endDate: '2026-12-01',
    });
    expect(until.endDate).toBe('2026-12-01');
    expect(until.maxOccurrences).toBeNull();

    const forever = toRecurringRuleInput({ ...valid, entryKind: 'fixo', endMode: 'forever' });
    expect(forever.endDate).toBeNull();
    expect(forever.maxOccurrences).toBeNull();
  });
});

describe('detailToFormValues', () => {
  it('mapeia o detalhe da transação pros valores do form', () => {
    const detail: TransactionDetail = {
      id: 't1',
      accountId: 'a1',
      categoryId: 'c1',
      description: 'Salário',
      direction: 'inflow',
      amountCents: 320000,
      occurredOn: '2026-06-05',
      accountLabel: 'Nubank',
      category: 'Renda',
      icon: 'payments',
    };
    expect(detailToFormValues(detail)).toEqual({
      entryKind: 'unico',
      amountCents: 320000,
      direction: 'inflow',
      accountId: 'a1',
      categoryId: 'c1',
      description: 'Salário',
      occurredOn: '2026-06-05',
      installmentCount: 2,
      frequency: 'monthly',
      endMode: 'forever',
      endDate: '',
      occurrences: 12,
    });
  });
});
