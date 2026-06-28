import { render, screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Card } from '../../src/components/Card';

describe('Card', () => {
  it('renderiza o conteúdo como View quando não há onPress', async () => {
    await render(
      <Card>
        <Text>conteúdo</Text>
      </Card>,
    );

    expect(screen.getByText('conteúdo')).toBeOnTheScreen();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('vira Pressable acessível e dispara onPress quando editável', async () => {
    const onPress = jest.fn();
    await render(
      <Card onPress={onPress} editLabel="Editar conta">
        <Text>conteúdo</Text>
      </Card>,
    );

    await userEvent.setup().press(screen.getByRole('button', { name: 'Editar conta' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
