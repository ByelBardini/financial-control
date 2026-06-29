import { getPatrimonioOverview } from '../../src/api/patrimonio';
import * as client from '../../src/api/client';

jest.mock('../../src/api/client');

beforeEach(() => jest.clearAllMocks());

// O path literal mora aqui — um typo quebraria a Início e a tela de Contas em runtime
// sem nenhum teste pegar. Mesma cobertura de api/contas e api/dashboard.
describe('api/patrimonio', () => {
  it('getPatrimonioOverview faz GET /patrimonio/overview', async () => {
    jest.mocked(client.apiGet).mockResolvedValue({} as never);
    await getPatrimonioOverview();
    expect(client.apiGet).toHaveBeenCalledWith('/patrimonio/overview');
  });
});
