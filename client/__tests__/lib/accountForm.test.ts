import {
  accountTypeMeta,
  detailToFormValues,
  initialValues,
  toNewAccountInput,
  toUpdateAccountInput,
  validateAccountForm,
  type AccountFormValues,
} from '../../src/lib/accountForm';
import type { AccountDetail } from '../../src/types/accounts';

const base: AccountFormValues = {
  name: 'Nubank',
  accountType: 'checking',
  openingBalanceCents: 50000,
  creditLimitCents: 0,
  subtitle: '',
  icon: 'account_balance',
  dotColor: '#d0bcff',
  tone: 'neutral',
};

describe('validateAccountForm', () => {
  it('exige nome', () => {
    expect(validateAccountForm({ ...base, name: '   ' }).name).toBeDefined();
  });

  it('cartão exige limite > 0', () => {
    const errs = validateAccountForm({ ...base, accountType: 'credit_card', creditLimitCents: 0 });
    expect(errs.creditLimit).toBeDefined();
  });

  it('formulário válido não tem erros', () => {
    expect(validateAccountForm(base)).toEqual({});
  });
});

describe('toNewAccountInput', () => {
  it('faz trim do nome, inclui saldo e zera subtitle/creditLimit fora de cartão', () => {
    const out = toNewAccountInput({
      ...base,
      name: '  Nubank  ',
      subtitle: '   ',
      creditLimitCents: 9999,
    });

    expect(out.name).toBe('Nubank');
    expect(out.openingBalanceCents).toBe(50000);
    expect(out.tone).toBe('neutral');
    expect(out.subtitle).toBeUndefined();
    expect(out.creditLimitCents).toBeUndefined(); // checking ignora limite
  });

  it('inclui creditLimit e subtitle para cartão', () => {
    const out = toNewAccountInput({
      ...base,
      accountType: 'credit_card',
      icon: 'credit_card',
      dotColor: '#8a05be',
      subtitle: 'Final 4022',
      creditLimitCents: 500000,
    });

    expect(out.creditLimitCents).toBe(500000);
    expect(out.subtitle).toBe('Final 4022');
  });

  it('zera o saldo inicial para cartão (cartão é só fatura, mesmo com valor no estado)', () => {
    const out = toNewAccountInput({
      ...base,
      accountType: 'credit_card',
      icon: 'credit_card',
      dotColor: '#8a05be',
      openingBalanceCents: 50000,
      creditLimitCents: 500000,
    });

    expect(out.openingBalanceCents).toBe(0);
  });
});

describe('toUpdateAccountInput', () => {
  it('não inclui saldo (saldo nunca é editável)', () => {
    const out = toUpdateAccountInput(base);
    expect('openingBalanceCents' in out).toBe(false);
  });
});

describe('initialValues / accountTypeMeta', () => {
  it('pré-seleciona ícone/cor do tipo', () => {
    const v = initialValues('voucher');
    expect(v.icon).toBe('restaurant');
    expect(v.dotColor).toBe('#9ddf2e');
    expect(v.accountType).toBe('voucher');
  });

  it('accountTypeMeta devolve o rótulo certo', () => {
    expect(accountTypeMeta('credit_card').label).toBe('Cartão');
  });

  it('accountTypeMeta cai no default p/ tipo não-gerenciável (savings/exchange)', () => {
    // savings/exchange existem no server mas não estão em ACCOUNT_TYPES — o meta não pode
    // quebrar (devolve o 1º preset como fallback de ícone/cor).
    expect(accountTypeMeta('savings').value).toBe('checking');
    expect(accountTypeMeta('exchange').value).toBe('checking');
  });
});

describe('detailToFormValues', () => {
  it('pré-preenche da conta sem trazer saldo', () => {
    const detail: AccountDetail = {
      id: 'a1',
      name: 'Nubank Cartão',
      accountType: 'credit_card',
      subtitle: 'Final 4022',
      balanceCents: -420000,
      icon: 'credit_card',
      tone: 'primary',
      dotColor: '#8a05be',
      creditLimitCents: 500000,
    };

    const v = detailToFormValues(detail);

    expect(v).toEqual({
      name: 'Nubank Cartão',
      accountType: 'credit_card',
      openingBalanceCents: 0,
      creditLimitCents: 500000,
      subtitle: 'Final 4022',
      icon: 'credit_card',
      dotColor: '#8a05be',
      tone: 'primary',
    });
  });

  it('preserva tipo não-gerenciável (poupança vem de /contas/banks) sem mentir/corromper', () => {
    // Uma conta savings é editável pela seção Bancos. O tipo precisa sobreviver ao
    // round-trip do form (não pode virar checking silenciosamente).
    const savings: AccountDetail = {
      id: 'a2',
      name: 'Poupança Caixa',
      accountType: 'savings',
      subtitle: 'Conta Poupança',
      balanceCents: 120000,
      icon: 'savings',
      tone: 'secondary',
      dotColor: '#33b58a',
      creditLimitCents: 0,
    };

    expect(detailToFormValues(savings).accountType).toBe('savings');
  });
});
