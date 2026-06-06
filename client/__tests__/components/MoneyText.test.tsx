import { render, screen } from '@testing-library/react-native';
import { MoneyText } from '../../src/components/MoneyText';

describe('MoneyText', () => {
  it('mostra o valor formatado quando visível', async () => {
    await render(<MoneyText cents={4250} />);
    expect(screen.getByText('R$ 42,50')).toBeOnTheScreen();
  });

  it('mascara o valor e expõe rótulo acessível quando hidden', async () => {
    await render(<MoneyText cents={4250} hidden />);
    expect(screen.queryByText('R$ 42,50')).toBeNull();
    expect(screen.getByLabelText('valor oculto')).toBeOnTheScreen();
  });
});
