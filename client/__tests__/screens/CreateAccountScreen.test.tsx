import { render, screen, userEvent } from '@testing-library/react-native';
import { CreateAccountScreen } from '../../src/screens/CreateAccountScreen';

// Asserções por comportamento/estrutura — o texto exato (irônico) pode mudar; o
// que importa é: avisa sobre aprovação, valida (alerta), confirma o envio e volta.
describe('CreateAccountScreen', () => {
  it('avisa que o cadastro depende de aprovação', async () => {
    await render(<CreateAccountScreen onBack={jest.fn()} />);
    expect(screen.getByText(/aprova/i)).toBeOnTheScreen();
  });

  it('valida o e-mail antes de enviar (mostra alerta)', async () => {
    await render(<CreateAccountScreen onBack={jest.fn()} />);

    await userEvent.setup().press(screen.getByRole('button'));
    expect(screen.getByRole('alert')).toBeOnTheScreen();
  });

  it('troca para a confirmação ao enviar um e-mail válido', async () => {
    const user = userEvent.setup();
    await render(<CreateAccountScreen onBack={jest.fn()} />);

    await user.type(screen.getByLabelText('E-mail'), 'voce@email.com');
    await user.press(screen.getByRole('button'));

    expect(screen.queryByLabelText('E-mail')).toBeNull(); // saiu do formulário
    expect(screen.getByRole('header')).toBeOnTheScreen(); // tela de confirmação
  });

  it('volta ao login pelo único link da tela', async () => {
    const onBack = jest.fn();
    await render(<CreateAccountScreen onBack={onBack} />);

    await userEvent.setup().press(screen.getByRole('link'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
