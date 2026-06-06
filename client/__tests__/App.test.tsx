import { render, screen } from '@testing-library/react-native';
import App from '../App';
import { queryClient } from '../src/api/queryClient';
import { mockDashboardApi } from './_support/renderWithClient';

// App já provê o próprio QueryClientProvider; aqui só mockamos a API (sem rede) e
// limpamos o cache no fim (senão o timer de GC do client real segura o processo).
jest.mock('../src/api/dashboard');

beforeEach(() => {
  mockDashboardApi();
});
afterEach(() => {
  queryClient.clear();
});

describe('App', () => {
  it('renderiza a marca Pobrify após carregar as fontes', async () => {
    await render(<App />);
    expect(await screen.findByText('Pobrify')).toBeOnTheScreen();
  });
});
