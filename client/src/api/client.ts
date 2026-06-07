import { API_BASE_URL } from './config';

// Erro de API com o status HTTP e a mensagem (corpo {"error": "..."} do server,
// quando houver). Permite que a UI distinga falha de rede/servidor (ex.: 401).
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Token de auth em memória. Setado pelo AuthContext (login/restauração/logout). O
// apiGet/apiPost o anexam como Bearer. Fica fora do React pra a camada de api não
// depender de hook nem de import circular.
let authToken: string | null = null;

// setAuthToken define (ou limpa, com null) o token enviado nas próximas chamadas.
export function setAuthToken(token: string | null): void {
  authToken = token;
}

function authHeaders(): Record<string, string> {
  return authToken ? { Authorization: `Bearer ${authToken}` } : {};
}

async function throwApiError(res: Response): Promise<never> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  throw new ApiError(body?.error ?? `HTTP ${res.status}`, res.status);
}

// GET tipado: monta a URL, anexa o Bearer (se houver), valida res.ok e parseia.
// É um dos dois únicos pontos do app que chamam fetch (o outro é apiPost).
//
//   const accounts = await apiGet<Account[]>('/accounts');
export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'GET',
    headers: { Accept: 'application/json', ...authHeaders() },
  });

  if (!res.ok) return throwApiError(res);
  return (await res.json()) as T;
}

// POST tipado com corpo JSON; anexa o Bearer (se houver). Usado pelo login.
//
//   const { token } = await apiPost<LoginResponse>('/auth/login', creds);
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });

  if (!res.ok) return throwApiError(res);
  return (await res.json()) as T;
}
