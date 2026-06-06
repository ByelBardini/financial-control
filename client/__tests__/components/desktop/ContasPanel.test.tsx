import { render, screen } from '@testing-library/react-native';
import { ContasPanel } from '../../../src/components/desktop/ContasPanel';
import { dashboardSnapshot } from '../../../src/mocks/dashboardSnapshot';

describe('ContasPanel (desktop)', () => {
  it('mostra as contas e o total somado', async () => {
    await render(<ContasPanel accounts={dashboardSnapshot.accounts} hidden={false} />);

    expect(screen.getByText('Nubank')).toBeOnTheScreen();
    expect(screen.getByText('R$ 842,20')).toBeOnTheScreen();
    expect(screen.getByText('R$ 2.734,50')).toBeOnTheScreen();
  });
});
