import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  archiveAsset,
  createAsset,
  createTrade,
  deleteTrade,
  getAsset,
  updateAsset,
} from '../api/investimentos';
import type { CreateAssetInput, CreateTradeInput, UpdateAssetInput } from '../types/investimentos';

// Criar/editar/arquivar ativo e comprar/vender mexem na carteira E, agora, no caixa: a operação
// liquida numa conta (transação kind='investment'). Então invalida as chaves de TODAS as telas
// afetadas — Investimentos, Contas (saldo derivado), Transações (extrato) e Dashboard. O
// QueryClient é compartilhado, então as quatro se atualizam. Mesmo padrão de useTransactionMutations.
function useInvalidateInvestments() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['investimentos'] });
    void queryClient.invalidateQueries({ queryKey: ['accounts'] });
    void queryClient.invalidateQueries({ queryKey: ['contas'] });
    void queryClient.invalidateQueries({ queryKey: ['transacoes'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };
}

// useAsset busca o detalhe (posição + operações) pro modal de detalhe/edição (só quando há id).
export const useAsset = (id: string | undefined) =>
  useQuery({
    queryKey: ['investimentos', 'asset', id],
    queryFn: () => getAsset(id as string),
    enabled: id !== undefined,
  });

export function useCreateAsset() {
  const invalidate = useInvalidateInvestments();
  return useMutation({
    mutationFn: (input: CreateAssetInput) => createAsset(input),
    onSuccess: invalidate,
  });
}

export function useUpdateAsset() {
  const invalidate = useInvalidateInvestments();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAssetInput }) => updateAsset(id, input),
    onSuccess: invalidate,
  });
}

export function useArchiveAsset() {
  const invalidate = useInvalidateInvestments();
  return useMutation({
    mutationFn: (id: string) => archiveAsset(id),
    onSuccess: invalidate,
  });
}

export function useCreateTrade() {
  const invalidate = useInvalidateInvestments();
  return useMutation({
    mutationFn: ({ assetId, input }: { assetId: string; input: CreateTradeInput }) =>
      createTrade(assetId, input),
    onSuccess: invalidate,
  });
}

export function useDeleteTrade() {
  const invalidate = useInvalidateInvestments();
  return useMutation({
    mutationFn: ({ assetId, tradeId }: { assetId: string; tradeId: string }) =>
      deleteTrade(assetId, tradeId),
    onSuccess: invalidate,
  });
}
