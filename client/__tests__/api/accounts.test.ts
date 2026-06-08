import { archiveAccount, createAccount, getAccount, updateAccount } from '../../src/api/accounts';
import * as client from '../../src/api/client';
import type { NewAccountInput, UpdateAccountInput } from '../../src/types/accounts';

jest.mock('../../src/api/client');

beforeEach(() => jest.clearAllMocks());

describe('api/accounts', () => {
  it('getAccount faz GET /accounts/{id}', async () => {
    jest.mocked(client.apiGet).mockResolvedValue({} as never);

    await getAccount('a1');

    expect(client.apiGet).toHaveBeenCalledWith('/accounts/a1');
  });

  it('createAccount faz POST /accounts com o corpo', async () => {
    jest.mocked(client.apiPost).mockResolvedValue({} as never);
    const input: NewAccountInput = {
      name: 'Nubank',
      accountType: 'checking',
      openingBalanceCents: 50000,
      icon: 'account_balance',
      tone: 'neutral',
      dotColor: '#d0bcff',
    };

    await createAccount(input);

    expect(client.apiPost).toHaveBeenCalledWith('/accounts', input);
  });

  it('updateAccount faz PATCH /accounts/{id} com o corpo (sem saldo)', async () => {
    jest.mocked(client.apiPatch).mockResolvedValue({} as never);
    const input: UpdateAccountInput = {
      name: 'Alelo',
      accountType: 'voucher',
      icon: 'restaurant',
      tone: 'neutral',
      dotColor: '#9ddf2e',
    };

    await updateAccount('a2', input);

    expect(client.apiPatch).toHaveBeenCalledWith('/accounts/a2', input);
  });

  it('archiveAccount faz DELETE /accounts/{id}', async () => {
    jest.mocked(client.apiDelete).mockResolvedValue(undefined);

    await archiveAccount('a3');

    expect(client.apiDelete).toHaveBeenCalledWith('/accounts/a3');
  });
});
