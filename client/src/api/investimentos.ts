import { apiDelete, apiGet, apiPatch, apiPost } from './client';
import { assessRisk } from '../lib/investmentRisk';
import type {
  AllocationSlice,
  AssetDetail,
  CreateAssetInput,
  CreateTradeInput,
  CryptoBlock,
  EvolutionPoint,
  PortfolioSummary,
  Position,
  PriceHistoryPoint,
  RiskAssessment,
  UpdateAssetInput,
} from '../types/investimentos';

// Camada de dados da tela de Investimentos — ligada à API real (mesmo padrão de src/api/contas).
// As views vêm prontas do server (posição derivada do preço médio móvel, cripto à parte). O
// **Risco fica no client**: o backend devolve só os números — o veredito ácido é derivado aqui
// por `assessRisk`, a partir do desempenho GERAL + cripto combinados.

export const getPortfolioSummary = () => apiGet<PortfolioSummary>('/investimentos/summary');

export const getPositions = () => apiGet<Position[]>('/investimentos/positions');

export const getAllocation = () => apiGet<AllocationSlice[]>('/investimentos/allocation');

export const getCryptoBlock = () => apiGet<CryptoBlock>('/investimentos/crypto');

// Evolução do patrimônio geral (valor de mercado × custo acumulado por dia). range = janela
// (1mo/3mo/6mo/1y/max). Cripto fica fora (tem o próprio gráfico no card).
export const getPortfolioEvolution = (range: string) =>
  apiGet<EvolutionPoint[]>(`/investimentos/evolution?range=${range}`);

// Série diária de preço de um ativo (gráfico de histórico no detalhe). range = janela.
export const getPriceHistory = (assetId: string, range: string) =>
  apiGet<PriceHistoryPoint[]>(`/investimentos/assets/${assetId}/history?range=${range}`);

// Risco = veredito derivado do lucro/perda GERAL (portfólio geral + cripto combinados). Sem
// endpoint próprio no server: buscamos summary + cripto e calculamos o % geral (custo = valor −
// ganho dos dois pilares), passando pro `assessRisk`. Centavos inteiros; % só pra escolher o tom.
export const getRiskAssessment = async (): Promise<RiskAssessment> => {
  const [summary, crypto] = await Promise.all([getPortfolioSummary(), getCryptoBlock()]);
  const gainCents = summary.gainCents + crypto.gainCents;
  const costCents =
    summary.totalCents - summary.gainCents + (crypto.subtotalCents - crypto.gainCents);
  const overallGainPct = costCents === 0 ? 0 : Math.round((gainCents / costCents) * 10000) / 100;
  return assessRisk(overallGainPct);
};

// --- Recurso de ativo/operação (CRUD + compra/venda) — espelha src/api/accounts.ts. ---
// O detalhe (posição + operações) volta no create/update/trade pra atualizar a UI sem novo GET.

export const getAsset = (id: string) => apiGet<AssetDetail>(`/investimentos/assets/${id}`);

export const createAsset = (input: CreateAssetInput) =>
  apiPost<AssetDetail>('/investimentos/assets', input);

export const updateAsset = (id: string, input: UpdateAssetInput) =>
  apiPatch<AssetDetail>(`/investimentos/assets/${id}`, input);

export const archiveAsset = (id: string) => apiDelete(`/investimentos/assets/${id}`);

export const createTrade = (assetId: string, input: CreateTradeInput) =>
  apiPost<AssetDetail>(`/investimentos/assets/${assetId}/trades`, input);

export const deleteTrade = (assetId: string, tradeId: string) =>
  apiDelete(`/investimentos/assets/${assetId}/trades/${tradeId}`);
