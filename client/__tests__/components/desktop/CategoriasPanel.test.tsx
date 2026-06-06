import { render, screen } from '@testing-library/react-native';
import { CategoriasPanel } from '../../../src/components/desktop/CategoriasPanel';
import { dashboardSnapshot } from '../../../src/mocks/dashboardSnapshot';

describe('CategoriasPanel (desktop)', () => {
  it('lista as categorias com suas barras', async () => {
    await render(<CategoriasPanel categories={dashboardSnapshot.categories} hidden={false} />);

    expect(screen.getByText('Alimentação')).toBeOnTheScreen();
    expect(screen.getByText('Assinaturas')).toBeOnTheScreen();
    expect(screen.getAllByRole('progressbar')).toHaveLength(4);
  });
});
