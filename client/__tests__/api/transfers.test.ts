import { createTransfer } from '../../src/api/transfers';
import * as client from '../../src/api/client';
import type { CreateTransferInput } from '../../src/types/transfers';

jest.mock('../../src/api/client');

beforeEach(() => jest.clearAllMocks());

describe('api/transfers', () => {
  it('createTransfer faz POST /transfers com o corpo', async () => {
    jest.mocked(client.apiPost).mockResolvedValue({} as never);
    const input: CreateTransferInput = {
      originAccountId: 'a1',
      destinationAccountId: 'a2',
      amountCents: 10000,
      occurredOn: '2026-06-15',
    };

    await createTransfer(input);

    expect(client.apiPost).toHaveBeenCalledWith('/transfers', input);
  });
});
