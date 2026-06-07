// Validação pura de formulário de auth (sem RN) — reusada por LoginScreen e
// CreateAccountScreen. Só o front: confere preenchimento e formato, nada de rede.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMAIL_REQUIRED = 'Faltou o e-mail (o mais básico você esqueceu).';
const EMAIL_INVALID = 'Esse e-mail é tão real quanto seu saldo positivo.';
const PASSWORD_REQUIRED = 'Cadê a senha? Sumiu que nem seu salário dia 5.';

// isValidEmail('voce@email.com') === true
export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export type LoginErrors = { email?: string; password?: string };

// Erros do login por campo; objeto vazio significa formulário válido.
export function validateLoginForm(values: { email: string; password: string }): LoginErrors {
  const errors: LoginErrors = {};
  const email = values.email.trim();
  if (!email) errors.email = EMAIL_REQUIRED;
  else if (!isValidEmail(email)) errors.email = EMAIL_INVALID;
  if (!values.password) errors.password = PASSWORD_REQUIRED;
  return errors;
}

// Mensagem de erro do e-mail da criação de conta, ou null se válido.
export function validateAccountEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return EMAIL_REQUIRED;
  if (!isValidEmail(trimmed)) return EMAIL_INVALID;
  return null;
}
