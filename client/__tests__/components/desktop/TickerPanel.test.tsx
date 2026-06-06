import { render, screen } from '@testing-library/react-native';
import { TickerPanel } from '../../../src/components/desktop/TickerPanel';
import { dashboardSnapshot } from '../../../src/mocks/dashboardSnapshot';

describe('TickerPanel (desktop)', () => {
  it('mostra cotação, posição e variação 24h', async () => {
    await render(<TickerPanel ticker={dashboardSnapshot.ticker} hidden={false} />);

    expect(screen.getByText('Bitcoin')).toBeOnTheScreen();
    expect(screen.getByText('R$ 342.500,00')).toBeOnTheScreen();
    expect(screen.getByText('+2,4% 24h')).toBeOnTheScreen();
  });
});
