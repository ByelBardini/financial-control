import * as client from '../../src/api/client';
import { login, me } from '../../src/api/auth';

jest.mock('../../src/api/client');

describe('api/auth', () => {
  it('login faz POST /auth/login com credenciais + rememberMe', async () => {
    jest
      .mocked(client.apiPost)
      .mockResolvedValue({ token: 't', user: { id: 'u', email: 'a@b.com', name: 'A' } });

    const res = await login('a@b.com', 'segredo', true);

    expect(client.apiPost).toHaveBeenCalledWith('/auth/login', {
      email: 'a@b.com',
      password: 'segredo',
      rememberMe: true,
    });
    expect(res.token).toBe('t');
  });

  it('me faz GET /auth/me', async () => {
    jest.mocked(client.apiGet).mockResolvedValue({ id: 'u', email: 'a@b.com', name: 'A' });

    const user = await me();

    expect(client.apiGet).toHaveBeenCalledWith('/auth/me');
    expect(user.email).toBe('a@b.com');
  });
});
