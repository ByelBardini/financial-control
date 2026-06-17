import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createInstallmentPurchase,
  createRecurringRule,
  createTransaction,
  deleteTransaction,
  getTransaction,
  registerRecurrence,
  updateTransaction,
} from '../api/transacoes';
import type {
  CreateInstallmentInput,
  CreateRecurringRuleInput,
  CreateTransactionInput,
  UpdateTransactionInput,
} from '../types/transacoes';

// Criar/editar/excluir transação muda o saldo (derivado) e os agregados → invalida as
// chaves das telas afetadas: Transações (lista/resumo/detalhe), Contas e Dashboard. O
// QueryClient é compartilhado, então as três telas se atualizam.
function useInvalidateTransactions() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['transacoes'] });
    void queryClient.invalidateQueries({ queryKey: ['accounts'] });
    void queryClient.invalidateQueries({ queryKey: ['contas'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };
}

// useTransaction busca o detalhe completo pra pré-preencher a edição (só quando há id).
export const useTransaction = (id: string | undefined) =>
  useQuery({
    queryKey: ['transacoes', 'detail', id],
    queryFn: () => getTransaction(id as string),
    enabled: id !== undefined,
  });

export function useCreateTransaction() {
  const invalidate = useInvalidateTransactions();
  return useMutation({
    mutationFn: (input: CreateTransactionInput) => createTransaction(input),
    onSuccess: invalidate,
  });
}

export function useCreateInstallmentPurchase() {
  const invalidate = useInvalidateTransactions();
  return useMutation({
    mutationFn: (input: CreateInstallmentInput) => createInstallmentPurchase(input),
    onSuccess: invalidate,
  });
}

export function useCreateRecurringRule() {
  const invalidate = useInvalidateTransactions();
  return useMutation({
    mutationFn: (input: CreateRecurringRuleInput) => createRecurringRule(input),
    onSuccess: invalidate,
  });
}

// Registra a ocorrência do período corrente de uma recorrência → lança uma transação real, então
// invalida as mesmas chaves (saldo derivado muda) e a lista de recorrências (o isDue some).
export function useRegisterRecurrence() {
  const invalidate = useInvalidateTransactions();
  return useMutation({
    mutationFn: (id: string) => registerRecurrence(id),
    onSuccess: invalidate,
  });
}

export function useUpdateTransaction() {
  const invalidate = useInvalidateTransactions();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTransactionInput }) =>
      updateTransaction(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteTransaction() {
  const invalidate = useInvalidateTransactions();
  return useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: invalidate,
  });
}
