import { render, screen, userEvent } from '@testing-library/react-native';
import { SectionError } from '../../src/components/SectionError';

describe('SectionError', () => {
  it('usa o label da seção na mensagem quando informado', async () => {
    await render(<SectionError label="as contas" />);

    expect(screen.getByText('Não foi possível carregar as contas.')).toBeOnTheScreen();
  });

  it('cai na mensagem genérica sem label', async () => {
    await render(<SectionError />);

    expect(screen.getByText('Não foi possível carregar esta seção.')).toBeOnTheScreen();
  });

  it('mostra "Tentar de novo" e dispara onRetry ao tocar', async () => {
    const onRetry = jest.fn();
    await render(<SectionError label="as contas" onRetry={onRetry} />);

    await userEvent.setup().press(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('não mostra o botão quando não há onRetry', async () => {
    await render(<SectionError label="as contas" />);

    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).toBeNull();
  });
});
