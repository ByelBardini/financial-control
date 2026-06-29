import { render, screen } from '@testing-library/react-native';
import { LiquidBalanceHeader } from '../../src/components/LiquidBalanceHeader';
import { patrimonioSnapshot } from '../../src/mocks/patrimonioSnapshot';

describe('LiquidBalanceHeader', () => {
  it('mostra o saldo líquido em destaque + subtotais Em bancos / Em espécie', async () => {
    await render(<LiquidBalanceHeader overview={patrimonioSnapshot} hidden={false} />);

    expect(screen.getByText('Saldo líquido')).toBeOnTheScreen();
    expect(screen.getByText('R$ 3.122,30')).toBeOnTheScreen();
    expect(screen.getByText('Em bancos')).toBeOnTheScreen();
    expect(screen.getByText('R$ 3.000,00')).toBeOnTheScreen();
    expect(screen.getByText('Em espécie')).toBeOnTheScreen();
    expect(screen.getByText('R$ 122,30')).toBeOnTheScreen();
  });

  it('mascara os valores quando hidden (líquido + 2 subtotais)', async () => {
    await render(<LiquidBalanceHeader overview={patrimonioSnapshot} hidden />);

    expect(screen.queryByText('R$ 3.122,30')).toBeNull();
    expect(screen.getAllByLabelText('valor oculto').length).toBe(3);
  });
});
