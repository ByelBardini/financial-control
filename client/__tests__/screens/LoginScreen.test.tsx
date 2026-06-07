import { render, screen, userEvent } from '@testing-library/react-native';
import { ApiError } from '../../src/api/client';
import { LoginScreen } from '../../src/screens/LoginScreen';

// Asserções por comportamento/estrutura (alerta, link/botão); o texto exato das
// mensagens de validação é fixado no teste de `authValidation`.
const noop = () => {};

describe('LoginScreen', () => {
  it('acusa os dois campos obrigatórios e não envia', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await render(<LoginScreen onSubmit={onSubmit} onNavigateToCreateAccount={noop} />);

    await userEvent.setup().press(screen.getByRole('button', { name: 'Entrar' }));

    expect(screen.getAllByRole('alert')).toHaveLength(2); // e-mail + senha
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('acusa e-mail mal formado e não envia', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await render(<LoginScreen onSubmit={onSubmit} onNavigateToCreateAccount={noop} />);

    await user.type(screen.getByLabelText('E-mail'), 'abc');
    await user.type(screen.getByLabelText('Senha'), 'segredo');
    await user.press(screen.getByRole('button', { name: 'Entrar' }));

    expect(screen.getByRole('alert')).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('envia e-mail, senha e rememberMe quando válidos', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    await render(<LoginScreen onSubmit={onSubmit} onNavigateToCreateAccount={noop} />);

    await user.type(screen.getByLabelText('E-mail'), 'voce@email.com');
    await user.type(screen.getByLabelText('Senha'), 'segredo');
    await user.press(screen.getByRole('button', { name: 'Entrar' }));

    expect(onSubmit).toHaveBeenCalledWith('voce@email.com', 'segredo', false);
  });

  it('mostra erro quando o login falha (401)', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new ApiError('credenciais inválidas', 401));
    const user = userEvent.setup();
    await render(<LoginScreen onSubmit={onSubmit} onNavigateToCreateAccount={noop} />);

    await user.type(screen.getByLabelText('E-mail'), 'voce@email.com');
    await user.type(screen.getByLabelText('Senha'), 'errada');
    await user.press(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/incorretos/i);
  });

  it('chama onNavigateToCreateAccount pelo único link', async () => {
    const onNavigateToCreateAccount = jest.fn();
    await render(
      <LoginScreen
        onSubmit={jest.fn().mockResolvedValue(undefined)}
        onNavigateToCreateAccount={onNavigateToCreateAccount}
      />,
    );

    await userEvent.setup().press(screen.getByRole('link'));
    expect(onNavigateToCreateAccount).toHaveBeenCalledTimes(1);
  });
});
