import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { archiveAccount, createAccount, getAccount, updateAccount } from '../api/accounts';
import type { NewAccountInput, UpdateAccountInput } from '../types/accounts';

// Invalida o que reflete contas: a lista do dashboard (['accounts'], que cobre
// ['accounts', id] por prefixo) e as views da tela de Contas (['contas', ...]).
// Assim criar/editar/arquivar atualiza as DUAS telas (QueryClient é compartilhado).
function useInvalidateAccounts() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['accounts'] });
    void queryClient.invalidateQueries({ queryKey: ['contas'] });
  };
}

// useAccount busca o detalhe completo pra pré-preencher a edição (só quando há id).
export const useAccount = (id: string | undefined) =>
  useQuery({
    queryKey: ['accounts', id],
    queryFn: () => getAccount(id as string),
    enabled: id !== undefined,
  });

export function useCreateAccount() {
  const invalidate = useInvalidateAccounts();
  return useMutation({
    mutationFn: (input: NewAccountInput) => createAccount(input),
    onSuccess: invalidate,
  });
}

export function useUpdateAccount() {
  const invalidate = useInvalidateAccounts();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAccountInput }) =>
      updateAccount(id, input),
    onSuccess: invalidate,
  });
}

export function useArchiveAccount() {
  const invalidate = useInvalidateAccounts();
  return useMutation({
    mutationFn: (id: string) => archiveAccount(id),
    onSuccess: invalidate,
  });
}
