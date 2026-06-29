import { render, screen } from '@testing-library/react-native';
import { BalanceHero } from '../../src/components/BalanceHero';
import { dashboardSnapshot } from '../../src/mocks/dashboardSnapshot';
import { patrimonioSnapshot } from '../../src/mocks/patrimonioSnapshot';

describe('BalanceHero', () => {
  const { balance } = dashboardSnapshot;
  const overview = patrimonioSnapshot;

  it('destaca o saldo líquido + subtotais, com métricas do mês e patrimônio à parte', async () => {
    await render(<BalanceHero balance={balance} overview={overview} hidden={false} />);

    // O número-herói é o saldo LÍQUIDO (estoque), não o resultado do mês (fluxo).
    expect(screen.getByText('Saldo líquido')).toBeOnTheScreen();
    expect(screen.getByText('R$ 3.122,30')).toBeOnTheScreen();
    expect(screen.getByText('Sobrevivendo')).toBeOnTheScreen();
    expect(screen.getByText('Vai dar pra pagar a Netflix. Talvez.')).toBeOnTheScreen();
    // subtotais do líquido
    expect(screen.getByText('Em bancos')).toBeOnTheScreen();
    expect(screen.getByText('Em espécie')).toBeOnTheScreen();
    // métricas do mês (fluxo), rotuladas "do mês"
    expect(screen.getByText('Receitas do mês')).toBeOnTheScreen();
    expect(screen.getByText('Gastos do mês')).toBeOnTheScreen();
    expect(screen.getByText('Resultado do mês')).toBeOnTheScreen();
    expect(screen.getByText('R$ 1.284,50')).toBeOnTheScreen(); // resultado do mês = net
    // à parte
    expect(screen.getByText('Patrimônio em ativos')).toBeOnTheScreen();
    expect(screen.getByText('Subtotal em cripto')).toBeOnTheScreen();
  });

  it('mascara todos os valores monetários quando hidden', async () => {
    await render(<BalanceHero balance={balance} overview={overview} hidden />);

    expect(screen.queryByText('R$ 3.122,30')).toBeNull();
    expect(screen.queryByText('R$ 1.284,50')).toBeNull();
    // líquido + 2 subtotais + 3 métricas do mês + 2 à parte = 8 valores ocultos
    expect(screen.getAllByLabelText('valor oculto').length).toBeGreaterThanOrEqual(8);
  });
});
