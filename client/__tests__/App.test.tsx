import { render, screen } from '@testing-library/react-native';
import App from '../App';

describe('App', () => {
  it('renderiza a mensagem inicial', async () => {
    await render(<App />);
    expect(screen.getByText(/Open up App\.tsx/i)).toBeTruthy();
  });
});
