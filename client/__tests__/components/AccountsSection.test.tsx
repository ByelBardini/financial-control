import { render, screen } from '@testing-library/react-native';
import { AccountsSection } from '../../src/components/AccountsSection';
import { dashboardSnapshot } from '../../src/mocks/dashboardSnapshot';

describe('AccountsSection', () => {
  it('lista as contas com nome e saldo formatado', async () => {
    await render(<AccountsSection accounts={dashboardSnapshot.accounts} hidden={false} />);

    expect(screen.getByText('Contas')).toBeOnTheScreen();
    expect(screen.getByText('Nubank')).toBeOnTheScreen();
    expect(screen.getByText('R$ 842,20')).toBeOnTheScreen();
    expect(screen.getByText('Inter')).toBeOnTheScreen();
    expect(screen.getByText('R$ 320,00')).toBeOnTheScreen();
    expect(screen.getByText('Binance')).toBeOnTheScreen();
    expect(screen.getByText('R$ 1.450,00')).toBeOnTheScreen();
  });

  it('mascara todos os saldos quando hidden', async () => {
    await render(<AccountsSection accounts={dashboardSnapshot.accounts} hidden />);

    expect(screen.queryByText('R$ 842,20')).toBeNull();
    expect(screen.getAllByLabelText('valor oculto')).toHaveLength(4);
  });
});
