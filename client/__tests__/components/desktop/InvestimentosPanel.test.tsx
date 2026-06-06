import { render, screen } from '@testing-library/react-native';
import { InvestimentosPanel } from '../../../src/components/desktop/InvestimentosPanel';
import { dashboardSnapshot } from '../../../src/mocks/dashboardSnapshot';

describe('InvestimentosPanel (desktop)', () => {
  it('mostra total da carteira, variação e itens', async () => {
    const { investments, investmentsSummary } = dashboardSnapshot;
    await render(
      <InvestimentosPanel investments={investments} summary={investmentsSummary} hidden={false} />,
    );

    expect(screen.getByText('R$ 4.820,00')).toBeOnTheScreen();
    expect(screen.getByText('+8,48%')).toBeOnTheScreen();
    expect(screen.getByText('BTC')).toBeOnTheScreen();
    expect(screen.getByText('+6,2%')).toBeOnTheScreen();
  });
});
