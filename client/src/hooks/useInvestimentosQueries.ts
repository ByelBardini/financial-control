import { useQuery } from '@tanstack/react-query';
import {
  getAllocation,
  getCryptoBlock,
  getPortfolioSummary,
  getPositions,
  getRiskAssessment,
} from '../api/investimentos';

// Hooks por seção da tela de Investimentos: cada um é um useQuery com chave estável sob
// o namespace ['investimentos', ...]. Toda chamada mora em src/api/investimentos; aqui só
// o wrapper de cache do React Query (mesmo padrão de useContasQueries).

export const useInvestmentSummary = () =>
  useQuery({ queryKey: ['investimentos', 'summary'], queryFn: () => getPortfolioSummary() });

export const useInvestmentPositions = () =>
  useQuery({ queryKey: ['investimentos', 'positions'], queryFn: () => getPositions() });

export const useInvestmentAllocation = () =>
  useQuery({ queryKey: ['investimentos', 'allocation'], queryFn: () => getAllocation() });

export const useCryptoBlock = () =>
  useQuery({ queryKey: ['investimentos', 'crypto'], queryFn: () => getCryptoBlock() });

export const useInvestmentRisk = () =>
  useQuery({ queryKey: ['investimentos', 'risk'], queryFn: () => getRiskAssessment() });
