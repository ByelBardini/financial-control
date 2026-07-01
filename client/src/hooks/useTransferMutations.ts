import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTransfer } from '../api/transfers';
import type { CreateTransferInput } from '../types/transfers';

// Uma transferência move o saldo das DUAS contas (derivado) e cria duas linhas no ledger →
// invalida as mesmas telas que o useCreateTransaction (Transações, Contas, Dashboard). Cobre
// também "pagar fatura" (transfer com destino no cartão), que muda o detalhe do cartão (['contas']).
function useInvalidateTransfers() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['transacoes'] });
    void queryClient.invalidateQueries({ queryKey: ['accounts'] });
    void queryClient.invalidateQueries({ queryKey: ['contas'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };
}

export function useCreateTransfer() {
  const invalidate = useInvalidateTransfers();
  return useMutation({
    mutationFn: (input: CreateTransferInput) => createTransfer(input),
    onSuccess: invalidate,
  });
}
