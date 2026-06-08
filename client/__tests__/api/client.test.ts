import { apiDelete, apiGet, apiPatch, apiPost, ApiError, setAuthToken } from '../../src/api/client';

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
  setAuthToken(null); // o token é estado de módulo — zera pra não vazar entre testes
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

  it('cai em "HTTP <status>" quando o corpo de erro não é JSON (json lança)', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new SyntaxError('Unexpected token < in JSON');
      },
    } as unknown as Response);

    const err = await apiGet('/x').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 502, message: 'HTTP 502' });
  });

  it('anexa Authorization: Bearer quando há token setado', async () => {
    fetchMock.mockResolvedValue(mockResponse({}));
    setAuthToken('tok-abc');

    await apiGet('/accounts');

    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer tok-abc');
  });

  it('não anexa Authorization quando não há token', async () => {
    fetchMock.mockResolvedValue(mockResponse({}));

    await apiGet('/accounts');

    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });
});

describe('apiPost', () => {
  it('faz POST com corpo JSON e devolve o corpo tipado', async () => {
    fetchMock.mockResolvedValue(mockResponse({ token: 't1' }));

    const data = await apiPost<{ token: string }>('/auth/login', { email: 'a@b.com' });

    expect(data).toEqual({ token: 't1' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:8080/auth/login');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ email: 'a@b.com' }));
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('lança ApiError(401) em credencial inválida', async () => {
    fetchMock.mockResolvedValue(
      mockResponse({ error: 'credenciais inválidas' }, { ok: false, status: 401 }),
    );

    await expect(apiPost('/auth/login', {})).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
    });
  });

  it('anexa Authorization: Bearer no POST quando há token', async () => {
    fetchMock.mockResolvedValue(mockResponse({}));
    setAuthToken('tok-xyz');

    await apiPost('/auth/me', {});

    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer tok-xyz');
  });
});

describe('apiPatch', () => {
  it('faz PATCH com corpo JSON e devolve o corpo tipado', async () => {
    fetchMock.mockResolvedValue(mockResponse({ id: 'a1', name: 'X' }));

    const data = await apiPatch<{ id: string; name: string }>('/accounts/a1', { name: 'X' });

    expect(data).toEqual({ id: 'a1', name: 'X' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:8080/accounts/a1');
    expect(init.method).toBe('PATCH');
    expect(init.body).toBe(JSON.stringify({ name: 'X' }));
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('lança ApiError(404) quando a conta não existe', async () => {
    fetchMock.mockResolvedValue(
      mockResponse({ error: 'não encontrada' }, { ok: false, status: 404 }),
    );

    await expect(apiPatch('/accounts/x', {})).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
    });
  });
});

describe('apiDelete', () => {
  it('faz DELETE e resolve sem corpo (204)', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 204 } as unknown as Response);

    await expect(apiDelete('/accounts/a1')).resolves.toBeUndefined();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:8080/accounts/a1');
    expect(init.method).toBe('DELETE');
  });

  it('anexa Authorization: Bearer no DELETE quando há token', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 204 } as unknown as Response);
    setAuthToken('tok-del');

    await apiDelete('/accounts/a1');

    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer tok-del');
  });

  it('lança ApiError em falha', async () => {
    fetchMock.mockResolvedValue(mockResponse({ error: 'nope' }, { ok: false, status: 404 }));

    await expect(apiDelete('/accounts/x')).rejects.toMatchObject({ name: 'ApiError', status: 404 });
  });
});
