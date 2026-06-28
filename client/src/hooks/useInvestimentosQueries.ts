import { useQuery } from '@tanstack/react-query';
import {
  getAllocation,
  getCryptoBlock,
  getPortfolioEvolution,
  getPortfolioSummary,
  getPositions,
  getPriceHistory,
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

export const usePortfolioEvolution = (range: string) =>
  useQuery({
    queryKey: ['investimentos', 'evolution', range],
    queryFn: () => getPortfolioEvolution(range),
  });

export const usePriceHistory = (assetId: string, range: string) =>
  useQuery({
    queryKey: ['investimentos', 'price-history', assetId, range],
    queryFn: () => getPriceHistory(assetId, range),
  });
