import { render, screen } from '@testing-library/react-native';
import { FutureDebtRow } from '../../src/components/FutureDebtRow';
import { transacoesSnapshot } from '../../src/mocks/transacoesSnapshot';

const iphone = transacoesSnapshot.debts.find((d) => d.id === 'iphone')!;

describe('FutureDebtRow', () => {
  it('mostra a dívida, a parcela, o valor e a barra de progresso', async () => {
    await render(<FutureDebtRow debt={iphone} hidden={false} />);

    expect(screen.getByText('iPhone 15 Pro')).toBeOnTheScreen();
    expect(screen.getByText('Parcela 04/12')).toBeOnTheScreen();
    expect(screen.getByText('R$ 499,00')).toBeOnTheScreen();
    expect(screen.getByText('Decisão financeira questionável #04')).toBeOnTheScreen();
    expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ now: 33 });
  });

  it('mascara o valor quando hidden', async () => {
    await render(<FutureDebtRow debt={iphone} hidden />);

    expect(screen.queryByText('R$ 499,00')).toBeNull();
    expect(screen.getByLabelText('valor oculto')).toBeOnTheScreen();
  });
});
