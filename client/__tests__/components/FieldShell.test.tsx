import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { FieldShell } from '../../src/components/FieldShell';

describe('FieldShell', () => {
  it('mostra o label e o conteúdo, sem erro por padrão', async () => {
    await render(
      <FieldShell label="Nome">
        <Text>conteúdo</Text>
      </FieldShell>,
    );

    expect(screen.getByText('Nome')).toBeOnTheScreen();
    expect(screen.getByText('conteúdo')).toBeOnTheScreen();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('anuncia a mensagem de erro como alert', async () => {
    await render(
      <FieldShell label="Nome" error="Obrigatório">
        <Text>conteúdo</Text>
      </FieldShell>,
    );

    expect(screen.getByRole('alert')).toBeOnTheScreen();
    expect(screen.getByText('Obrigatório')).toBeOnTheScreen();
  });
});
