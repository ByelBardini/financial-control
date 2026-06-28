import { render, screen, userEvent } from '@testing-library/react-native';
import { Fab } from '../../src/components/Fab';

describe('Fab', () => {
  it('expõe role/label e dispara onPress ao tocar', async () => {
    const onPress = jest.fn();
    await render(
      <Fab iconName="add" accessibilityLabel="Nova conta" onPress={onPress} bottom={88} />,
    );

    await userEvent.setup().press(screen.getByRole('button', { name: 'Nova conta' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('não dispara onPress quando desabilitado', async () => {
    const onPress = jest.fn();
    await render(
      <Fab iconName="add" accessibilityLabel="Novo ativo" onPress={onPress} bottom={88} disabled />,
    );

    const button = screen.getByRole('button', { name: 'Novo ativo' });
    expect(button).toBeDisabled();
    await userEvent.setup().press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});
