import { render, screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { EditableCard } from '../../src/components/EditableCard';

describe('EditableCard', () => {
  it('vira botão "Editar" acessível quando há onPress', async () => {
    const onPress = jest.fn();
    await render(
      <EditableCard className="card" editLabel="Editar Nubank" onPress={onPress}>
        <Text>conteúdo</Text>
      </EditableCard>,
    );

    const button = screen.getByRole('button', { name: 'Editar Nubank' });
    expect(button).toBeOnTheScreen();
    await userEvent.setup().press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('é View comum (sem role de botão) quando não há onPress', async () => {
    await render(
      <EditableCard className="card" editLabel="Editar Nubank">
        <Text>conteúdo</Text>
      </EditableCard>,
    );

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('conteúdo')).toBeOnTheScreen();
  });
});
