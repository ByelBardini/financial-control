import { render, screen } from '@testing-library/react-native';
import { CategorySpendSection } from '../../src/components/CategorySpendSection';
import { dashboardSnapshot } from '../../src/mocks/dashboardSnapshot';

describe('CategorySpendSection', () => {
  it('mostra cada categoria com rótulo, valor e barra de progresso', async () => {
    await render(<CategorySpendSection categories={dashboardSnapshot.categories} hidden={false} />);

    expect(screen.getByText('Gastos por Categoria')).toBeOnTheScreen();
    expect(screen.getByText('Alimentação')).toBeOnTheScreen();
    expect(screen.getByText('R$ 620,00')).toBeOnTheScreen();
    expect(screen.getByText('Transporte')).toBeOnTheScreen();
    expect(screen.getByText('R$ 210,00')).toBeOnTheScreen();
    expect(screen.getByText('Assinaturas')).toBeOnTheScreen();
    expect(screen.getByText('R$ 85,00')).toBeOnTheScreen();
    expect(screen.getAllByRole('progressbar')).toHaveLength(4);
  });
});
