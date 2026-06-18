import { render, screen } from '@testing-library/react-native';
import { TransactionAmount } from '../../src/components/TransactionAmount';

describe('TransactionAmount', () => {
  it('mostra saída com sinal negativo', async () => {
    await render(<TransactionAmount amountCents={8990} direction="outflow" />);
    expect(screen.getByText('- R$ 89,90')).toBeOnTheScreen();
  });

  it('mostra entrada com sinal positivo', async () => {
    await render(<TransactionAmount amountCents={20000} direction="inflow" />);
    expect(screen.getByText('+ R$ 200,00')).toBeOnTheScreen();
  });

  it('mascara o valor quando hidden', async () => {
    await render(<TransactionAmount amountCents={8990} direction="outflow" hidden />);
    expect(screen.queryByText('- R$ 89,90')).toBeNull();
    expect(screen.getByLabelText('valor oculto')).toBeOnTheScreen();
  });
});
