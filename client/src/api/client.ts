import { API_BASE_URL } from './config';

// Erro de API com o status HTTP e a mensagem (corpo {"error": "..."} do server,
// quando houver). Permite que a UI distinga falha de rede/servidor.
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// GET tipado: monta a URL, pede JSON, valida res.ok e parseia. Lança ApiError em
// falha (status + mensagem do corpo). É o ÚNICO lugar do app que chama fetch.
//
//   const accounts = await apiGet<Account[]>('/accounts');
export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(body?.error ?? `HTTP ${res.status}`, res.status);
  }

  return (await res.json()) as T;
}
