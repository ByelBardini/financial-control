import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AuthLayout } from '../../../src/components/auth/AuthLayout';

describe('AuthLayout', () => {
  it('mostra a marca, o conteúdo e o rodapé da empresa', async () => {
    await render(
      <AuthLayout>
        <Text>conteúdo do formulário</Text>
      </AuthLayout>,
    );

    expect(screen.getByText('Pobrify')).toBeOnTheScreen();
    expect(screen.getByText('conteúdo do formulário')).toBeOnTheScreen();
    expect(screen.getByText(/Evolutiva Sistemas/)).toBeOnTheScreen();
  });
});
