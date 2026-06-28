import {
  archiveAsset,
  createAsset,
  createTrade,
  deleteTrade,
  getAllocation,
  getAsset,
  getCryptoBlock,
  getPortfolioEvolution,
  getPortfolioSummary,
  getPositions,
  getPriceHistory,
  getRiskAssessment,
  updateAsset,
} from '../../src/api/investimentos';
import * as client from '../../src/api/client';
import type {
  CreateAssetInput,
  CreateTradeInput,
  UpdateAssetInput,
} from '../../src/types/investimentos';

jest.mock('../../src/api/client');

beforeEach(() => jest.clearAllMocks());

// As views são ligadas à API real: cada função é dona de um path literal — um typo aqui
// quebraria a tela em runtime sem nenhum teste pegar. Mesma cobertura de api/contas. As
// invariantes (cripto fora do total, gain = valor − custo) agora vivem no backend
// (server/test/investimentos_integration_test.go).
describe('api/investimentos (views)', () => {
  it('getPortfolioSummary faz GET /investimentos/summary', async () => {
    jest.mocked(client.apiGet).mockResolvedValue({} as never);
    await getPortfolioSummary();
    expect(client.apiGet).toHaveBeenCalledWith('/investimentos/summary');
  });

  it('getPositions faz GET /investimentos/positions', async () => {
    jest.mocked(client.apiGet).mockResolvedValue([] as never);
    await getPositions();
    expect(client.apiGet).toHaveBeenCalledWith('/investimentos/positions');
  });

  it('getAllocation faz GET /investimentos/allocation', async () => {
    jest.mocked(client.apiGet).mockResolvedValue([] as never);
    await getAllocation();
    expect(client.apiGet).toHaveBeenCalledWith('/investimentos/allocation');
  });

  it('getCryptoBlock faz GET /investimentos/crypto', async () => {
    jest.mocked(client.apiGet).mockResolvedValue({} as never);
    await getCryptoBlock();
    expect(client.apiGet).toHaveBeenCalledWith('/investimentos/crypto');
  });

  it('getPortfolioEvolution faz GET /investimentos/evolution com o range', async () => {
    jest.mocked(client.apiGet).mockResolvedValue([] as never);
    await getPortfolioEvolution('6mo');
    expect(client.apiGet).toHaveBeenCalledWith('/investimentos/evolution?range=6mo');
  });

  it('getPriceHistory faz GET /investimentos/assets/{id}/history com o range', async () => {
    jest.mocked(client.apiGet).mockResolvedValue([] as never);
    await getPriceHistory('a1', '1y');
    expect(client.apiGet).toHaveBeenCalledWith('/investimentos/assets/a1/history?range=1y');
  });
});

// O Risco não tem endpoint: é derivado no client a partir do desempenho geral + cripto.
describe('api/investimentos — getRiskAssessment (derivado)', () => {
  it('combina summary + cripto e deriva o veredito por assessRisk', async () => {
    jest.mocked(client.apiGet).mockImplementation((path: string) => {
      if (path === '/investimentos/summary') {
        return Promise.resolve({
          totalCents: 250000,
          gainCents: -9400,
          gainPct: -3.62,
          title: '',
          quip: '',
        } as never);
      }
      if (path === '/investimentos/crypto') {
        return Promise.resolve({
          title: '',
          subtitle: '',
          subtotalCents: 46965,
          gainCents: 1965,
          gainPct: 4.37,
          holdings: [],
        } as never);
      }
      return Promise.resolve({} as never);
    });

    const risk = await getRiskAssessment();

    // ganho geral = -9400 + 1965 = -7435; custo = 259400 + 45000 = 304400 → ~ -2,44%
    expect(risk.resultPct).toBeCloseTo(-2.44, 2);
    expect(risk.levelTone).toBe('error'); // prejuízo leve → "Sangrando Devagar"
    expect(client.apiGet).toHaveBeenCalledWith('/investimentos/summary');
    expect(client.apiGet).toHaveBeenCalledWith('/investimentos/crypto');
  });

  it('custo total 0 (carteira vazia) → 0% sem divisão por zero', async () => {
    jest.mocked(client.apiGet).mockImplementation((path: string) => {
      if (path === '/investimentos/summary') {
        return Promise.resolve({
          totalCents: 0,
          gainCents: 0,
          gainPct: 0,
          title: '',
          quip: '',
        } as never);
      }
      if (path === '/investimentos/crypto') {
        return Promise.resolve({
          title: '',
          subtotalCents: 0,
          gainCents: 0,
          gainPct: 0,
          holdings: [],
        } as never);
      }
      return Promise.resolve({} as never);
    });

    const risk = await getRiskAssessment();
    expect(risk.resultPct).toBe(0);
  });
});

// O recurso de ativo/operação: cada função é dona de um verbo+path literal (um typo aqui
// quebraria o cadastro/compra/venda em runtime). Mesma cobertura de api/accounts.
describe('api/investimentos (recurso ativo/operação)', () => {
  it('getAsset faz GET /investimentos/assets/{id}', async () => {
    jest.mocked(client.apiGet).mockResolvedValue({} as never);
    await getAsset('a1');
    expect(client.apiGet).toHaveBeenCalledWith('/investimentos/assets/a1');
  });

  it('createAsset faz POST /investimentos/assets com o corpo', async () => {
    const input: CreateAssetInput = {
      ticker: 'WEGE3',
      name: 'WEG ON',
      assetClass: 'acoes',
      icon: 'corporate_fare',
      currentPriceCents: 5000,
    };
    jest.mocked(client.apiPost).mockResolvedValue({} as never);
    await createAsset(input);
    expect(client.apiPost).toHaveBeenCalledWith('/investimentos/assets', input);
  });

  it('updateAsset faz PATCH /investimentos/assets/{id} com o corpo', async () => {
    const input: UpdateAssetInput = {
      ticker: 'WEGE3',
      name: 'WEG ON',
      icon: 'corporate_fare',
      currentPriceCents: 5200,
    };
    jest.mocked(client.apiPatch).mockResolvedValue({} as never);
    await updateAsset('a1', input);
    expect(client.apiPatch).toHaveBeenCalledWith('/investimentos/assets/a1', input);
  });

  it('archiveAsset faz DELETE /investimentos/assets/{id}', async () => {
    jest.mocked(client.apiDelete).mockResolvedValue(undefined);
    await archiveAsset('a1');
    expect(client.apiDelete).toHaveBeenCalledWith('/investimentos/assets/a1');
  });

  it('createTrade faz POST /investimentos/assets/{id}/trades com o corpo', async () => {
    const input: CreateTradeInput = {
      side: 'buy',
      quantity: '10.5',
      unitPriceCents: 1000,
      tradedOn: '2026-06-19',
      accountId: 'acc-1',
    };
    jest.mocked(client.apiPost).mockResolvedValue({} as never);
    await createTrade('a1', input);
    expect(client.apiPost).toHaveBeenCalledWith('/investimentos/assets/a1/trades', input);
  });

  it('deleteTrade faz DELETE /investimentos/assets/{id}/trades/{tradeId}', async () => {
    jest.mocked(client.apiDelete).mockResolvedValue(undefined);
    await deleteTrade('a1', 't9');
    expect(client.apiDelete).toHaveBeenCalledWith('/investimentos/assets/a1/trades/t9');
  });
});
