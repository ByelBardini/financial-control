import { useQuery } from '@tanstack/react-query';
import {
  getBankAccounts,
  getCardDetail,
  getCashWallet,
  getCreditCards,
  getManagementTip,
  getPovertyXray,
  getVouchers,
} from '../api/contas';

// Hooks por recurso da tela de Contas: cada um é um useQuery com chave estável sob
// o namespace ['contas', ...]. Toda chamada mora em src/api/contas; aqui só o
// wrapper de cache do React Query (mesmo padrão de useDashboardQueries).

export const useBankAccounts = () =>
  useQuery({ queryKey: ['contas', 'banks'], queryFn: () => getBankAccounts() });

export const useCreditCards = () =>
  useQuery({ queryKey: ['contas', 'cards'], queryFn: () => getCreditCards() });

// Detalhe de um cartão (cabeçalho + faturas por mês), só quando há id (overlay aberto).
export const useCardDetail = (id: string | undefined) =>
  useQuery({
    queryKey: ['contas', 'card', id],
    queryFn: () => getCardDetail(id as string),
    enabled: id !== undefined,
  });

export const useVouchers = () =>
  useQuery({ queryKey: ['contas', 'vouchers'], queryFn: () => getVouchers() });

export const useCashWallet = () =>
  useQuery({ queryKey: ['contas', 'cash'], queryFn: () => getCashWallet() });

export const usePovertyXray = () =>
  useQuery({ queryKey: ['contas', 'xray'], queryFn: () => getPovertyXray() });

export const useManagementTip = () =>
  useQuery({ queryKey: ['contas', 'tip'], queryFn: () => getManagementTip() });
