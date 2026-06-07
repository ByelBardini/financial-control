import { render, screen, userEvent } from '@testing-library/react-native';
import { AuthButton } from '../../../src/components/auth/AuthButton';

describe('AuthButton', () => {
  it('chama onPress ao pressionar', async () => {
    const onPress = jest.fn();
    await render(<AuthButton label="Entrar" onPress={onPress} />);

    await userEvent.setup().press(screen.getByRole('button', { name: 'Entrar' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('marca busy e não dispara onPress enquanto carrega', async () => {
    const onPress = jest.fn();
    await render(<AuthButton label="Entrar" onPress={onPress} loading />);

    const button = screen.getByRole('button', { name: 'Entrar' });
    expect(button).toBeBusy();
    await userEvent.setup().press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('não dispara onPress quando desabilitado', async () => {
    const onPress = jest.fn();
    await render(<AuthButton label="Entrar" onPress={onPress} disabled />);

    const button = screen.getByRole('button', { name: 'Entrar' });
    expect(button).toBeDisabled();
    await userEvent.setup().press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});
