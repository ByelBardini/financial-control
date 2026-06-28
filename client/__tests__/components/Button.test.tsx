import { render, screen, userEvent } from '@testing-library/react-native';
import { Button } from '../../src/components/Button';

describe('Button', () => {
  it('mostra o rótulo e dispara onPress ao tocar', async () => {
    const onPress = jest.fn();
    await render(<Button label="Nova conta" onPress={onPress} />);

    expect(screen.getByText('Nova conta')).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Nova conta' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('usa accessibilityLabel próprio quando informado', async () => {
    await render(
      <Button label="Novo ativo" accessibilityLabel="Cadastrar ativo" onPress={jest.fn()} />,
    );

    expect(screen.getByRole('button', { name: 'Cadastrar ativo' })).toBeOnTheScreen();
  });

  it('marca busy e não dispara onPress enquanto carrega', async () => {
    const onPress = jest.fn();
    await render(<Button label="Salvar" onPress={onPress} loading />);

    const button = screen.getByRole('button', { name: 'Salvar' });
    expect(button).toBeBusy();
    await userEvent.setup().press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('não dispara onPress quando desabilitado', async () => {
    const onPress = jest.fn();
    await render(<Button label="Salvar" onPress={onPress} disabled />);

    const button = screen.getByRole('button', { name: 'Salvar' });
    expect(button).toBeDisabled();
    await userEvent.setup().press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('dispara onPress (fallback imediato) ao tocar com measureAnchor', async () => {
    const onPress = jest.fn();
    await render(<Button label="Nova transação" onPress={onPress} measureAnchor />);

    await userEvent.setup().press(screen.getByRole('button', { name: 'Nova transação' }));
    expect(onPress).toHaveBeenCalled();
  });

  it('renderiza nas variantes sem quebrar', async () => {
    await render(<Button label="Comprar" variant="primary" iconName="add" onPress={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Comprar' })).toBeOnTheScreen();
  });

  it('renderiza o submit full-width (size lg + block) e dispara onPress', async () => {
    const onPress = jest.fn();
    await render(
      <Button label="Criar conta" variant="primary" size="lg" block onPress={onPress} />,
    );

    await userEvent.setup().press(screen.getByRole('button', { name: 'Criar conta' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
