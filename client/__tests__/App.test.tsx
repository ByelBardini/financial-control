import { render, screen } from '@testing-library/react-native';
import App from '../App';

describe('App', () => {
  it('renderiza a marca Pobrify após carregar as fontes', async () => {
    await render(<App />);
    expect(await screen.findByText('Pobrify')).toBeOnTheScreen();
  });
});
