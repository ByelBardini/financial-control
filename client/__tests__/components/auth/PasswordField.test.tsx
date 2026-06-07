import { render, screen, userEvent } from '@testing-library/react-native';
import { PasswordField } from '../../../src/components/auth/PasswordField';

describe('PasswordField', () => {
  it('começa oculto (secureTextEntry) e expõe o botão "Mostrar senha"', async () => {
    await render(<PasswordField label="Senha" value="segredo" onChangeText={jest.fn()} />);

    expect(screen.getByLabelText('Senha').props.secureTextEntry).toBe(true);
    expect(screen.getByRole('button', { name: 'Mostrar senha' })).toBeOnTheScreen();
  });

  it('revela e oculta a senha ao pressionar o olho', async () => {
    const user = userEvent.setup();
    await render(<PasswordField label="Senha" value="segredo" onChangeText={jest.fn()} />);

    await user.press(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(screen.getByLabelText('Senha').props.secureTextEntry).toBe(false);

    await user.press(screen.getByRole('button', { name: 'Ocultar senha' }));
    expect(screen.getByLabelText('Senha').props.secureTextEntry).toBe(true);
  });
});
