import { useQuery } from '@tanstack/react-query';
import { getPatrimonioOverview } from '../api/patrimonio';

// Hook do patrimônio: estoque all-time, chave estável SEM mês (['patrimonio','overview']).
// Compartilhado pela Início e pela tela de Contas (mesmo dado → conciliam). As mutations que
// mexem em saldo (conta/transação/operação) invalidam ['patrimonio'] pra manter fresco.
export const usePatrimonioOverview = () =>
  useQuery({ queryKey: ['patrimonio', 'overview'], queryFn: () => getPatrimonioOverview() });
