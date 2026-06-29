import { apiGet } from './client';
import type { PatrimonioOverview } from '../types/patrimonio';

// "Quanto eu tenho hoje": saldo líquido + blocos à parte. Fonte única (server) que faz a
// Início e a tela de Contas mostrarem o mesmo número. Toda chamada HTTP mora aqui (apiGet).
export const getPatrimonioOverview = () => apiGet<PatrimonioOverview>('/patrimonio/overview');
