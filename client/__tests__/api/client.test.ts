import { apiGet, ApiError } from '../../src/api/client';

// Monta um Response falso só com o que o apiGet usa (ok/status/json).
const mockResponse = (body: unknown, init?: { ok?: boolean; status?: number }) =>
  ({
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    json: async () => body,
  }) as unknown as Response;

const fetchMock = jest.fn();

beforeEach(() => {
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});
afterEach(() => {
  fetchMock.mockReset();
});

describe('apiGet', () => {
  it('faz GET na base + path pedindo JSON e devolve o corpo tipado', async () => {
    const payload = [{ id: 'nubank', balanceCents: 84220 }];
    fetchMock.mockResolvedValue(mockResponse(payload));

    const data = await apiGet<typeof payload>('/accounts');

    expect(data).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8080/accounts', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
  });

  it('lança ApiError com status e a mensagem do corpo {error} em falha', async () => {
    fetchMock.mockResolvedValue(mockResponse({ error: 'boom' }, { ok: false, status: 500 }));

    await expect(apiGet('/dashboard/summary')).rejects.toMatchObject({
      name: 'ApiError',
      status: 500,
      message: 'boom',
    });
  });

  it('cai em "HTTP <status>" quando o corpo de erro não traz error', async () => {
    fetchMock.mockResolvedValue(mockResponse(null, { ok: false, status: 404 }));

    const err = await apiGet('/x').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 404, message: 'HTTP 404' });
  });
});
