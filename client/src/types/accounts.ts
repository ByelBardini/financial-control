import type { IconName } from '../components/Icon';
import type { Tone } from './dashboard';

// Espelha o account_type do server (6 valores; fonte: migrations 00001+00003). O
// formulário só CRIA/EDITA os 4 de ACCOUNT_TYPES (lib/accountForm); savings/exchange
// existem no backend e podem chegar via GET (ex.: poupança lista em /contas/banks),
// então o tipo precisa ser honesto — senão um AccountDetail de poupança mentiria o tipo.
export type AccountType = 'checking' | 'savings' | 'cash' | 'voucher' | 'credit_card' | 'exchange';

// Conta completa devolvida por GET /accounts/{id} e por criar/editar. Espelha o
// AccountDetail do server (valores em centavos). O form ignora balanceCents (saldo
// não é editável).
export interface AccountDetail {
  id: string;
  name: string;
  accountType: AccountType;
  subtitle: string;
  balanceCents: number;
  icon: IconName;
  tone: Tone;
  dotColor: string;
  creditLimitCents: number;
}

// Corpo de criação (inclui o saldo inicial). subtitle/creditLimitCents opcionais.
export interface NewAccountInput {
  name: string;
  accountType: AccountType;
  openingBalanceCents: number;
  icon: IconName;
  tone: Tone;
  dotColor: string;
  subtitle?: string;
  creditLimitCents?: number;
}

// Corpo de edição: igual ao de criação, porém SEM saldo (nunca editável).
export interface UpdateAccountInput {
  name: string;
  accountType: AccountType;
  icon: IconName;
  tone: Tone;
  dotColor: string;
  subtitle?: string;
  creditLimitCents?: number;
}
