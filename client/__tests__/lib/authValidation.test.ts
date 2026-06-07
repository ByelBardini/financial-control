import {
  isValidEmail,
  validateAccountEmail,
  validateLoginForm,
} from '../../src/lib/authValidation';

describe('isValidEmail', () => {
  it.each([
    ['voce@email.com', true],
    ['nome.sobrenome@email.com.br', true],
    ['  voce@email.com  ', true], // espaços ao redor são aparados
    ['VOCE@EMAIL.COM', true], // sem restrição de caixa
    ['a@b.co', true],
    ['', false],
    ['   ', false],
    ['abc', false],
    ['a@b', false],
    ['a @b.com', false],
    ['@email.com', false],
    ['a@b@c.com', false], // dois @
    ['voce@@email.com', false],
    ['voce@email.', false], // nada depois do ponto
    ['voce@.com', false], // nada antes do ponto
  ])('valida %s como %s', (value, expected) => {
    expect(isValidEmail(value)).toBe(expected);
  });
});

describe('validateLoginForm', () => {
  it('exige e-mail e senha quando ambos vazios', () => {
    expect(validateLoginForm({ email: '', password: '' })).toEqual({
      email: 'Faltou o e-mail (o mais básico você esqueceu).',
      password: 'Cadê a senha? Sumiu que nem seu salário dia 5.',
    });
  });

  it('reprova e-mail mal formado', () => {
    expect(validateLoginForm({ email: 'abc', password: 'segredo' })).toEqual({
      email: 'Esse e-mail é tão real quanto seu saldo positivo.',
    });
  });

  it('não acusa erro quando e-mail e senha são válidos', () => {
    expect(validateLoginForm({ email: 'voce@email.com', password: 'segredo' })).toEqual({});
  });

  it('apara espaços ao redor do e-mail antes de validar', () => {
    expect(validateLoginForm({ email: '  voce@email.com  ', password: 'segredo' })).toEqual({});
  });

  it('acusa só a senha quando o e-mail é válido mas a senha falta', () => {
    expect(validateLoginForm({ email: 'voce@email.com', password: '' })).toEqual({
      password: 'Cadê a senha? Sumiu que nem seu salário dia 5.',
    });
  });
});

describe('validateAccountEmail', () => {
  it('retorna mensagem quando vazio', () => {
    expect(validateAccountEmail('   ')).toBe('Faltou o e-mail (o mais básico você esqueceu).');
  });

  it('retorna mensagem quando inválido', () => {
    expect(validateAccountEmail('abc')).toBe('Esse e-mail é tão real quanto seu saldo positivo.');
  });

  it('retorna null quando válido', () => {
    expect(validateAccountEmail('voce@email.com')).toBeNull();
  });
});
