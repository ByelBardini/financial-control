import { render, screen } from '@testing-library/react-native';
import { BalanceHero } from '../../src/components/BalanceHero';
import { dashboardSnapshot } from '../../src/mocks/dashboardSnapshot';

describe('BalanceHero', () => {
  const { balance } = dashboardSnapshot;

  it('mostra saldo, status, frase e sub-métricas formatadas', async () => {
    await render(<BalanceHero balance={balance} hidden={false} />);

    expect(screen.getByText('Saldo do Mês')).toBeOnTheScreen();
    expect(screen.getByText('R$ 1.284,50')).toBeOnTheScreen();
    expect(screen.getByText('Sobrevivendo')).toBeOnTheScreen();
    expect(screen.getByText('Vai dar pra pagar a Netflix. Talvez.')).toBeOnTheScreen();
    expect(screen.getByText('Receitas')).toBeOnTheScreen();
    expect(screen.getByText('R$ 3.200,00')).toBeOnTheScreen();
    expect(screen.getByText('R$ 1.915,50')).toBeOnTheScreen();
    expect(screen.getByText('R$ 500,00')).toBeOnTheScreen();
  });

  it('mascara todos os valores monetários quando hidden', async () => {
    await render(<BalanceHero balance={balance} hidden />);

    expect(screen.queryByText('R$ 1.284,50')).toBeNull();
    expect(screen.queryByText('R$ 3.200,00')).toBeNull();
    expect(screen.getAllByLabelText('valor oculto').length).toBeGreaterThanOrEqual(4);
  });
});
