// Rotas da área autenticada (sem lib de routing). O AuthenticatedApp é dono do
// estado e a navegação (Side/Bottom nav) recebe currentRoute + onNavigate.
export type AppRoute = 'dashboard' | 'contas' | 'transacoes';
