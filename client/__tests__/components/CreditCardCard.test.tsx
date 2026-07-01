import { render, screen, userEvent } from '@testing-library/react-native';
import { CreditCardCard } from '../../src/components/CreditCardCard';
import { contasSnapshot } from '../../src/mocks/contasSnapshot';

const [roxinho] = contasSnapshot.cards;

describe('CreditCardCard', () => {
  it('mostra nome, fatura, barra de uso, disponível e nota', async () => {
    await render(<CreditCardCard card={roxinho} hidden={false} />);

    expect(screen.getByText('Nubank Roxinho')).toBeOnTheScreen();
    expect(screen.getByText('R$ 320,00')).toBeOnTheScreen();
    expect(screen.getByText('Ainda fingindo controle')).toBeOnTheScreen();
    expect(screen.getByText('R$ 1.180,00 de R$ 1.500,00 livre')).toBeOnTheScreen();
    expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ now: 21, min: 0, max: 100 });
  });

  it('mascara os valores quando hidden', async () => {
    await render(<CreditCardCard card={roxinho} hidden />);

    expect(screen.queryByText('R$ 320,00')).toBeNull();
    expect(screen.queryByText('R$ 1.180,00 de R$ 1.500,00 livre')).toBeNull();
    expect(screen.getByLabelText('valor oculto')).toBeOnTheScreen();
  });

  it('vira botão "Abrir cartão" quando onPress é fornecido', async () => {
    const onPress = jest.fn();
    await render(<CreditCardCard card={roxinho} hidden={false} onPress={onPress} />);

    await userEvent.setup().press(screen.getByRole('button', { name: 'Abrir Nubank Roxinho' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
