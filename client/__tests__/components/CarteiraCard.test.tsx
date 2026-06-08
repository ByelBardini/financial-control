import { render, screen } from '@testing-library/react-native';
import { CarteiraCard } from '../../src/components/CarteiraCard';
import { contasSnapshot } from '../../src/mocks/contasSnapshot';

describe('CarteiraCard', () => {
  it('mostra título, saldo, frase e confiança', async () => {
    await render(<CarteiraCard cash={contasSnapshot.cash} hidden={false} />);

    expect(screen.getByText('Carteira Física')).toBeOnTheScreen();
    expect(screen.getByText('R$ 122,30')).toBeOnTheScreen();
    expect(screen.getByText('4%')).toBeOnTheScreen();
    expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ now: 4, min: 0, max: 100 });
  });

  it('mascara o saldo quando hidden', async () => {
    await render(<CarteiraCard cash={contasSnapshot.cash} hidden />);

    expect(screen.queryByText('R$ 122,30')).toBeNull();
    expect(screen.getByLabelText('valor oculto')).toBeOnTheScreen();
  });
});
