import { render, screen } from '@testing-library/react-native';
import { ContasPanel } from '../../../src/components/desktop/ContasPanel';
import { dashboardSnapshot } from '../../../src/mocks/dashboardSnapshot';

describe('ContasPanel (desktop)', () => {
  it('lista cada conta com saldo (o total líquido mora no herói, não soma no client)', async () => {
    await render(<ContasPanel accounts={dashboardSnapshot.accounts} hidden={false} />);

    expect(screen.getByText('Nubank')).toBeOnTheScreen();
    expect(screen.getByText('R$ 842,20')).toBeOnTheScreen();
    // A soma crua do client (R$ 2.734,50) sumiu — incluía exchange/cartão e divergia do líquido.
    expect(screen.queryByText('R$ 2.734,50')).toBeNull();
  });
});
