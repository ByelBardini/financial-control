import { render, screen } from '@testing-library/react-native';
import { SaldoHero } from '../../../src/components/desktop/SaldoHero';
import { dashboardSnapshot } from '../../../src/mocks/dashboardSnapshot';
import { patrimonioSnapshot } from '../../../src/mocks/patrimonioSnapshot';

describe('SaldoHero (desktop)', () => {
  const { balance } = dashboardSnapshot;
  const overview = patrimonioSnapshot;

  it('destaca o saldo líquido + subtotais, status e métricas do mês', async () => {
    await render(<SaldoHero balance={balance} overview={overview} hidden={false} />);

    expect(screen.getByText('Saldo líquido')).toBeOnTheScreen();
    expect(screen.getByText('R$ 3.122,30')).toBeOnTheScreen();
    expect(screen.getByText('Sobrevivendo')).toBeOnTheScreen();
    expect(screen.getByText('Em bancos')).toBeOnTheScreen();
    expect(screen.getByText('Receitas do mês')).toBeOnTheScreen();
    expect(screen.getByText('Patrimônio em ativos')).toBeOnTheScreen();
  });
});
