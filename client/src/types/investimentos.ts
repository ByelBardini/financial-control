import type { IconName } from '../components/Icon';
import type { Tone } from './dashboard';

// Modelo da tela de Investimentos. Reusa Tone/Diagnosis do dashboard e PanicMeter de
// contas; valores monetários sempre em centavos inteiros (formatação só na borda, via
// MoneyText/formatBRL). Valoração MANUAL — sem cotação ao vivo: a "variação" de cada
// posição é o ganho/perda do valor atual informado vs. o total investido.

// Classes de ativo. As views do portfólio GERAL só usam as 3 primeiras (cripto é um
// pilar à parte, fora do total/alocação geral), mas o CRUD de ativo cadastra cripto
// também — então o union precisa ser honesto (igual ao AccountType em types/accounts).
export type AssetClass = 'acoes' | 'fiis' | 'renda_fixa' | 'cripto';

// Posição do portfólio geral. gainCents = currentValueCents - costBasisCents.
export interface Position {
  id: string;
  ticker: string;
  name: string;
  assetClass: AssetClass;
  icon: IconName;
  costBasisCents: number; // total investido (preço médio acumulado)
  currentValueCents: number; // valor atual informado (manual)
  gainCents: number;
  gainPct: number;
}

// Resumo do portfólio geral (só Ações/FIIs/Renda Fixa — cripto fora).
export interface PortfolioSummary {
  totalCents: number;
  gainCents: number;
  gainPct: number;
  title: string;
  quip: string;
}

// Fatia da alocação por classe. percent (0..100) tinge a largura do segmento;
// tone dá a cor distinta de cada classe na barra/legenda.
export interface AllocationSlice {
  assetClass: AssetClass;
  label: string;
  valueCents: number;
  percent: number;
  tone: Tone;
}

// Posição de cripto (pilar à parte). Mesma ideia de ganho/perda manual da Position.
// series = pontos {date, priceCents} ao longo do tempo pro gráfico do card (PriceSparkline);
// o tooltip mostra data + valor do ponto. Mesmo shape do histórico de qualquer ativo.
export interface CryptoHolding {
  id: string;
  symbol: string;
  name: string;
  icon: IconName;
  costBasisCents: number;
  currentValueCents: number;
  gainCents: number;
  gainPct: number;
  series: PriceHistoryPoint[];
}

// Bloco de cripto separado do portfólio geral ("são outra parada"): subtotal próprio.
// subtitle é derivado no server e omitido quando não há holdings (JSON `omitempty`), então é opcional.
export interface CryptoBlock {
  title: string;
  subtitle?: string;
  subtotalCents: number;
  gainCents: number;
  gainPct: number;
  holdings: CryptoHolding[];
}

// Ponto da evolução do patrimônio GERAL (cripto fora): valor de mercado × custo acumulado por dia.
// O gap entre as duas linhas = ganho não-realizado (padrão de mercado pra "valorizou ou não?").
// Centavos inteiros; date AAAA-MM-DD.
export interface EvolutionPoint {
  date: string;
  marketValueCents: number;
  costBasisCents: number;
}

// Ponto da série diária de preço de um ativo (gráfico de histórico no detalhe). Centavos inteiros.
export interface PriceHistoryPoint {
  date: string;
  priceCents: number;
}

// Avaliação de Risco = veredito de DESEMPENHO no estilo do mockup (SEM barra/medidor): status
// grande colorido + ícone de tendência + resumo + frase ácida, tudo derivado do lucro/perda geral.
export interface RiskAssessment {
  level: string; // status grande ("Sangrando Devagar"...)
  levelTone: Tone; // cor do status (verde lucro / vermelho prejuízo / neutro empate)
  icon: IconName; // 'trending_up' | 'trending_down'
  summary: string; // descrição curta sob o status
  resultPct: number; // resultado geral (lucro/perda) em %
  quip: string; // frase ácida no rodapé
}

// --- Recurso de ativo/operação (CRUD + compra/venda) — shape 1:1 com internal/investimentos/crud.go ---

// Posição derivada de um ativo (metadados + quantidade/preço médio/valor/realizado). É a base
// do detalhe e o item da lista de ativos. quantity como string decimal (até 8 casas, sem float).
export interface AssetPosition {
  id: string;
  ticker: string;
  name: string;
  assetClass: AssetClass;
  icon: IconName;
  currentPriceCents: number;
  netQuantity: string;
  avgPriceCents: number;
  costBasisCents: number;
  currentValueCents: number;
  gainCents: number;
  gainPct: number;
  realizedCents: number;
}

// Uma operação (compra/venda) na resposta do detalhe. accountId = conta de liquidação
// (vazio nos trades legados/seed sem caixa). quantity como string decimal.
export interface Trade {
  id: string;
  side: 'buy' | 'sell';
  quantity: string;
  unitPriceCents: number;
  tradedOn: string; // YYYY-MM-DD
  accountId: string;
}

// Detalhe do ativo: posição derivada + as operações (mais recentes recomputam a posição).
export interface AssetDetail extends AssetPosition {
  trades: Trade[];
}

// Corpo de criação de ativo (preço atual em centavos). assetClass é imutável após criar.
export interface CreateAssetInput {
  ticker: string;
  name: string;
  assetClass: AssetClass;
  icon: IconName;
  currentPriceCents: number;
}

// Corpo de edição de ativo: metadados + preço atual, SEM a classe (imutável).
export interface UpdateAssetInput {
  ticker: string;
  name: string;
  icon: IconName;
  currentPriceCents: number;
}

// Corpo de uma operação. quantity como string decimal; accountId = conta que liquida
// (debita na compra / credita na venda); tradedOn AAAA-MM-DD.
export interface CreateTradeInput {
  side: 'buy' | 'sell';
  quantity: string;
  unitPriceCents: number;
  tradedOn: string;
  accountId: string;
}

// Snapshot completo: fixture de teste hoje, shape da futura API de Investimentos.
export interface InvestimentosSnapshot {
  summary: PortfolioSummary;
  positions: Position[];
  allocation: AllocationSlice[];
  crypto: CryptoBlock;
  risk: RiskAssessment;
}
