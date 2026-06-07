import { render, screen, userEvent } from '@testing-library/react-native';
import { useAuth } from '../../src/auth/AuthContext';
import { RootNavigator } from '../../src/navigation/RootNavigator';

// Mock do gate de sessão: controla o status pra testar a decisão de rota.
jest.mock('../../src/auth/AuthContext', () => ({ useAuth: jest.fn() }));

// Dashboard real puxa as queries; aqui só importa o gate, então usamos um stub.
jest.mock('../../src/screens/DashboardScreen', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- fábrica do jest.mock exige require
  DashboardScreen: require('../_support/DashboardStub').DashboardStub,
}));

function mockAuth(overrides: Partial<ReturnType<typeof useAuth>> = {}) {
  jest.mocked(useAuth).mockReturnValue({
    status: 'unauthenticated',
    user: null,
    signIn: jest.fn().mockResolvedValue(undefined),
    signOut: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  });
}

describe('RootNavigator', () => {
  it('loading → não mostra login nem dashboard', async () => {
    mockAuth({ status: 'loading' });
    await render(<RootNavigator />);
    expect(screen.queryByRole('button', { name: 'Entrar' })).toBeNull();
    expect(screen.queryByText('Dashboard')).toBeNull();
  });

  it('sem sessão → mostra o login', async () => {
    mockAuth({ status: 'unauthenticated' });
    await render(<RootNavigator />);
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeOnTheScreen();
  });

  it('com sessão → mostra o dashboard', async () => {
    mockAuth({ status: 'authenticated' });
    await render(<RootNavigator />);
    expect(screen.getByText('Dashboard')).toBeOnTheScreen();
  });

  it('abre criar conta pelo link e volta pro login', async () => {
    mockAuth({ status: 'unauthenticated' });
    const user = userEvent.setup();
    await render(<RootNavigator />);

    await user.press(screen.getByRole('link')); // único link do login → criar conta
    expect(screen.getByText(/aprova/i)).toBeOnTheScreen();

    await user.press(screen.getByRole('link')); // único link do criar conta → login
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeOnTheScreen();
  });
});
