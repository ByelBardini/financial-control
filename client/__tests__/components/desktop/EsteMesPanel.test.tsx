import { render, screen } from '@testing-library/react-native';
import { EsteMesPanel } from '../../../src/components/desktop/EsteMesPanel';
import { dashboardSnapshot } from '../../../src/mocks/dashboardSnapshot';

describe('EsteMesPanel (desktop)', () => {
  it('mostra % gasto, maior vilão e diagnóstico', async () => {
    const { esteMes, diagnosis } = dashboardSnapshot;
    await render(<EsteMesPanel esteMes={esteMes} diagnosis={diagnosis} />);

    expect(screen.getByText('Você gastou 59% da sua receita.')).toBeOnTheScreen();
    expect(screen.getByText('Maior vilão')).toBeOnTheScreen();
    expect(screen.getByText('Alimentação')).toBeOnTheScreen();
    expect(screen.getByText('Diagnóstico Pobrify')).toBeOnTheScreen();
  });
});
