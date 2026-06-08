import {
  getBankAccounts,
  getCashWallet,
  getCreditCards,
  getManagementTip,
  getPovertyXray,
  getVouchers,
} from '../../src/api/contas';
import * as client from '../../src/api/client';

jest.mock('../../src/api/client');

beforeEach(() => jest.clearAllMocks());

// Cada função de src/api/contas é dona de um path literal — um typo aqui quebraria a
// tela em runtime sem nenhum teste pegar. Mesma cobertura de api/dashboard e api/accounts.
describe('api/contas', () => {
  it('getBankAccounts faz GET /contas/banks', async () => {
    jest.mocked(client.apiGet).mockResolvedValue([] as never);
    await getBankAccounts();
    expect(client.apiGet).toHaveBeenCalledWith('/contas/banks');
  });

  it('getCreditCards faz GET /contas/cards', async () => {
    jest.mocked(client.apiGet).mockResolvedValue([] as never);
    await getCreditCards();
    expect(client.apiGet).toHaveBeenCalledWith('/contas/cards');
  });

  it('getVouchers faz GET /contas/vouchers', async () => {
    jest.mocked(client.apiGet).mockResolvedValue([] as never);
    await getVouchers();
    expect(client.apiGet).toHaveBeenCalledWith('/contas/vouchers');
  });

  it('getCashWallet faz GET /contas/cash', async () => {
    jest.mocked(client.apiGet).mockResolvedValue({} as never);
    await getCashWallet();
    expect(client.apiGet).toHaveBeenCalledWith('/contas/cash');
  });

  it('getPovertyXray faz GET /contas/xray', async () => {
    jest.mocked(client.apiGet).mockResolvedValue({} as never);
    await getPovertyXray();
    expect(client.apiGet).toHaveBeenCalledWith('/contas/xray');
  });

  it('getManagementTip faz GET /contas/tip', async () => {
    jest.mocked(client.apiGet).mockResolvedValue({} as never);
    await getManagementTip();
    expect(client.apiGet).toHaveBeenCalledWith('/contas/tip');
  });
});
