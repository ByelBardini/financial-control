import { render, screen, userEvent } from '@testing-library/react-native';
import { CategoryBar } from '../../src/components/CategoryBar';
import type { CategorySpend } from '../../src/types/dashboard';

const alimentacao: CategorySpend = {
  id: 'alimentacao',
  label: 'Alimentação',
  amountCents: 62000,
  percent: 70,
  tone: 'primary',
};

describe('CategoryBar', () => {
  it('mostra rótulo, valor e barra de progresso', async () => {
    await render(<CategoryBar category={alimentacao} hidden={false} />);

    expect(screen.getByText('Alimentação')).toBeOnTheScreen();
    expect(screen.getByText('R$ 620,00')).toBeOnTheScreen();
    expect(screen.getByRole('progressbar')).toBeOnTheScreen();
  });

  it('mascara o valor quando hidden', async () => {
    await render(<CategoryBar category={alimentacao} hidden />);

    expect(screen.queryByText('R$ 620,00')).toBeNull();
    expect(screen.getByLabelText('valor oculto')).toBeOnTheScreen();
  });

  it('esconde o share até a interação e revela ao tocar', async () => {
    const user = userEvent.setup();
    await render(<CategoryBar category={alimentacao} hidden={false} />);

    expect(screen.queryByText('70%')).not.toBeOnTheScreen();

    await user.press(screen.getByTestId('category-bar-alimentacao'));
    expect(screen.getByText('70%')).toBeOnTheScreen();
  });
});
