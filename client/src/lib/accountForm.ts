import type { IconName } from '../components/Icon';
import type { Tone } from '../types/dashboard';
import type {
  AccountDetail,
  AccountType,
  NewAccountInput,
  UpdateAccountInput,
} from '../types/accounts';

// Metadados de cada tipo gerenciável: rótulo PT + ícone/cor padrão (pré-seleção).
type AccountTypeMeta = {
  value: AccountType;
  label: string;
  defaultIcon: IconName;
  defaultColor: string;
};

export const ACCOUNT_TYPES: AccountTypeMeta[] = [
  { value: 'checking', label: 'Banco', defaultIcon: 'account_balance', defaultColor: '#d0bcff' },
  { value: 'voucher', label: 'Vale', defaultIcon: 'restaurant', defaultColor: '#9ddf2e' },
  { value: 'credit_card', label: 'Cartão', defaultIcon: 'credit_card', defaultColor: '#8a05be' },
  { value: 'cash', label: 'Dinheiro', defaultIcon: 'savings', defaultColor: '#958ea0' },
];

// Presets de aparência (cor de marca + ícone) pra distinguir contas do mesmo tipo.
export const COLOR_PRESETS = [
  '#d0bcff',
  '#9ddf2e',
  '#8a05be',
  '#ff7a00',
  '#004990',
  '#f3ba2f',
  '#33b58a',
  '#958ea0',
];

export const ICON_PRESETS: IconName[] = [
  'account_balance',
  'account_balance_wallet',
  'credit_card',
  'payments',
  'savings',
  'wallet',
  'restaurant',
  'shopping_basket',
  'currency_bitcoin',
  'corporate_fare',
];

export function accountTypeMeta(type: AccountType): AccountTypeMeta {
  return ACCOUNT_TYPES.find((t) => t.value === type) ?? ACCOUNT_TYPES[0];
}

// Valores controlados do formulário (saldo/limite em centavos).
export type AccountFormValues = {
  name: string;
  accountType: AccountType;
  openingBalanceCents: number;
  creditLimitCents: number;
  subtitle: string;
  icon: IconName;
  dotColor: string;
  tone: Tone;
};

// Valores iniciais pra um tipo (criação / ao trocar o tipo). tone fica neutro: a
// cor de marca é o dotColor escolhido; o tom semântico não é exposto no form.
export function initialValues(type: AccountType = 'checking'): AccountFormValues {
  const meta = accountTypeMeta(type);
  return {
    name: '',
    accountType: type,
    openingBalanceCents: 0,
    creditLimitCents: 0,
    subtitle: '',
    icon: meta.defaultIcon,
    dotColor: meta.defaultColor,
    tone: 'neutral',
  };
}

export type AccountFormErrors = { name?: string; creditLimit?: string };

// Validação do client (o server revalida). Cartão exige limite > 0 (senão o Raio-X
// não faz sentido); nome obrigatório.
export function validateAccountForm(v: AccountFormValues): AccountFormErrors {
  const errors: AccountFormErrors = {};
  if (v.name.trim() === '') errors.name = 'Dá um nome pra essa conta.';
  if (v.accountType === 'credit_card' && v.creditLimitCents <= 0) {
    errors.creditLimit = 'Cartão precisa de um limite maior que zero.';
  }
  return errors;
}

// Campos comuns ao create/update (limite só p/ cartão; subtitle vazio vira undefined).
function sharedInput(v: AccountFormValues) {
  return {
    name: v.name.trim(),
    accountType: v.accountType,
    icon: v.icon,
    tone: v.tone,
    dotColor: v.dotColor,
    subtitle: v.subtitle.trim() ? v.subtitle.trim() : undefined,
    creditLimitCents: v.accountType === 'credit_card' ? v.creditLimitCents : undefined,
  };
}

// Cartão de crédito não tem saldo inicial — o saldo é só a fatura (acumula via
// transações). Zera o openingBalanceCents mesmo se sobrou valor no estado do form.
export function toNewAccountInput(v: AccountFormValues): NewAccountInput {
  const openingBalanceCents = v.accountType === 'credit_card' ? 0 : v.openingBalanceCents;
  return { ...sharedInput(v), openingBalanceCents };
}

export function toUpdateAccountInput(v: AccountFormValues): UpdateAccountInput {
  return sharedInput(v);
}

// Pré-preenche o formulário a partir do detalhe da conta (edição). O saldo não entra
// (nunca editável); openingBalanceCents fica 0 e não é usado no modo editar.
export function detailToFormValues(d: AccountDetail): AccountFormValues {
  return {
    name: d.name,
    accountType: d.accountType,
    openingBalanceCents: 0,
    creditLimitCents: d.creditLimitCents,
    subtitle: d.subtitle,
    icon: d.icon,
    dotColor: d.dotColor,
    tone: d.tone,
  };
}
