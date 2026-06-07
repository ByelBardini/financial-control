import { apiGet, apiPost } from './client';

// AuthUser espelha o DTO do server (/auth/login e /auth/me): id, email e name.
export type AuthUser = {
  id: string;
  email: string;
  name: string;
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
};

// login bate em POST /auth/login. rememberMe controla a validade do token (o
// server decide o `exp`: ~24h sem, ~30d com). Lança ApiError(401) em credencial inválida.
export function login(email: string, password: string, rememberMe: boolean): Promise<LoginResponse> {
  return apiPost<LoginResponse>('/auth/login', { email, password, rememberMe });
}

// me valida a sessão atual (GET /auth/me). Exige o token já em setAuthToken;
// lança ApiError(401) se o token expirou/é inválido.
export function me(): Promise<AuthUser> {
  return apiGet<AuthUser>('/auth/me');
}
