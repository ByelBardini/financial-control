import { render, screen } from '@testing-library/react-native';
import { CashflowMetric } from '../../src/components/CashflowMetric';

describe('CashflowMetric', () => {
  it('mostra o rótulo e o valor formatado', async () => {
    await render(<CashflowMetric label="Esperança (Inflow)" cents={425000} tone="secondary" />);

    expect(screen.getByText('Esperança (Inflow)')).toBeOnTheScreen();
    expect(screen.getByText('R$ 4.250,00')).toBeOnTheScreen();
  });

  it('mascara o valor quando hidden', async () => {
    await render(<CashflowMetric label="Realidade (Outflow)" cents={589022} hidden />);

    expect(screen.queryByText('R$ 5.890,22')).toBeNull();
    expect(screen.getByLabelText('valor oculto')).toBeOnTheScreen();
  });
});
