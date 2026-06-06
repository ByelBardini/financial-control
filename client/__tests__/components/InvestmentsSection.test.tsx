import { render, screen } from '@testing-library/react-native';
import { InvestmentsSection } from '../../src/components/InvestmentsSection';
import { dashboardSnapshot } from '../../src/mocks/dashboardSnapshot';

describe('InvestmentsSection', () => {
  it('lista investimentos com variação diária e valor', async () => {
    await render(<InvestmentsSection investments={dashboardSnapshot.investments} hidden={false} />);

    expect(screen.getByText('Investimentos (Risos)')).toBeOnTheScreen();
    expect(screen.getByText('BTC')).toBeOnTheScreen();
    expect(screen.getByText('+6,2% hoje')).toBeOnTheScreen();
    expect(screen.getByText('R$ 2.100,00')).toBeOnTheScreen();
    expect(screen.getByText('CDB 110% CDI')).toBeOnTheScreen();
    expect(screen.getByText('+1,4% hoje')).toBeOnTheScreen();
    expect(screen.getByText('R$ 1.220,00')).toBeOnTheScreen();
  });
});
