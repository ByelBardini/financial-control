import { render, screen } from '@testing-library/react-native';
import { ContasHero } from '../../src/components/ContasHero';

describe('ContasHero', () => {
  it('mostra o título da tela, sem patrimônio líquido', async () => {
    await render(<ContasHero />);

    expect(screen.getByText('Monitor de Sobrevivência')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Suas contas' })).toBeOnTheScreen();
    expect(screen.queryByText('Patrimônio Líquido')).toBeNull();
  });
});
