import { render, screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { FormField } from '../../../src/components/auth/FormField';

describe('FormField', () => {
  it('mostra o label e o valor atual', async () => {
    await render(<FormField label="E-mail" value="voce@email.com" onChangeText={jest.fn()} />);

    expect(screen.getByText('E-mail')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('voce@email.com')).toBeOnTheScreen();
  });

  it('dispara onChangeText ao digitar', async () => {
    const onChangeText = jest.fn();
    await render(<FormField label="E-mail" value="" onChangeText={onChangeText} />);

    await userEvent.setup().type(screen.getByLabelText('E-mail'), 'a');
    expect(onChangeText).toHaveBeenCalledWith('a');
  });

  it('mostra a mensagem de erro como alerta', async () => {
    await render(
      <FormField label="E-mail" value="" onChangeText={jest.fn()} error="Informe seu e-mail." />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Informe seu e-mail.');
  });

  it('renderiza o slot à direita (ex.: toggle de senha)', async () => {
    await render(
      <FormField
        label="Senha"
        value=""
        onChangeText={jest.fn()}
        rightSlot={<Text testID="slot">olho</Text>}
      />,
    );

    expect(screen.getByTestId('slot')).toBeOnTheScreen();
  });
});
