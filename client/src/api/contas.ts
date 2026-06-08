import { apiGet } from './client';
import type {
  BankAccount,
  CashWallet,
  CreditCard,
  ManagementTip,
  PovertyXray,
  Voucher,
} from '../types/contas';

// Views agregadas da tela de Contas, ligadas à API real (mesmo padrão de
// src/api/dashboard). Sem total agregado: a tela mostra o saldo de cada conta + o
// cartão (Raio-X), não um "patrimônio líquido".

export const getBankAccounts = () => apiGet<BankAccount[]>('/contas/banks');

export const getCreditCards = () => apiGet<CreditCard[]>('/contas/cards');

export const getVouchers = () => apiGet<Voucher[]>('/contas/vouchers');

export const getCashWallet = () => apiGet<CashWallet>('/contas/cash');

export const getPovertyXray = () => apiGet<PovertyXray>('/contas/xray');

export const getManagementTip = () => apiGet<ManagementTip>('/contas/tip');
