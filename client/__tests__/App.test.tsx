import { render, screen } from '@testing-library/react-native';
import App from '../App';

// O app abre na tela de login (RootNavigator). Login não dispara queries, então
// não é preciso mockar a API nem limpar o cache aqui.
describe('App', () => {
  it('abre na tela de login após carregar as fontes', async () => {
    await render(<App />);

    expect(await screen.findByText('Pobrify')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeOnTheScreen();
  });
});
