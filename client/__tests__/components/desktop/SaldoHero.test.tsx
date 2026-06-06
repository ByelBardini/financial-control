import { render, screen } from '@testing-library/react-native';
import { SaldoHero } from '../../../src/components/desktop/SaldoHero';
import { dashboardSnapshot } from '../../../src/mocks/dashboardSnapshot';

describe('SaldoHero (desktop)', () => {
  const { balance } = dashboardSnapshot;

  it('mostra saldo disponível, status e sub-métricas', async () => {
    await render(<SaldoHero balance={balance} hidden={false} />);

    expect(screen.getByText('Disponível para gastar')).toBeOnTheScreen();
    expect(screen.getByText('R$ 1.284,50')).toBeOnTheScreen();
    expect(screen.getByText('Sobrevivendo')).toBeOnTheScreen();
    expect(screen.getByText('R$ 3.200,00')).toBeOnTheScreen();
  });
});
