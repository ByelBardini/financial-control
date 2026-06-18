import { render, screen } from '@testing-library/react-native';
import { CashflowSummary } from '../../src/components/CashflowSummary';
import { transacoesSnapshot } from '../../src/mocks/transacoesSnapshot';

const { summary } = transacoesSnapshot;

describe('CashflowSummary (cards mobile)', () => {
  it('mostra inflow, outflow e o net burn com a barra', async () => {
    await render(<CashflowSummary summary={summary} hidden={false} />);

    expect(screen.getByText('R$ 4.250,00')).toBeOnTheScreen();
    expect(screen.getByText('R$ 5.890,22')).toBeOnTheScreen();
    expect(screen.getByText('Net Burn Rate')).toBeOnTheScreen();
    expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ now: 75 });
  });

  it('mascara os valores quando hidden', async () => {
    await render(<CashflowSummary summary={summary} hidden />);

    expect(screen.queryByText('R$ 4.250,00')).toBeNull();
    expect(screen.getAllByLabelText('valor oculto').length).toBeGreaterThan(0);
  });
});
