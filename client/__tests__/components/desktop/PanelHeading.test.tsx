import { render, screen } from '@testing-library/react-native';
import { PanelHeading } from '../../../src/components/desktop/PanelHeading';

describe('PanelHeading (desktop)', () => {
  it('renderiza o título como header e a contagem quando fornecida', async () => {
    await render(
      <PanelHeading
        icon="account_balance"
        iconColor="#73d39a"
        title="Bancos"
        count="3 CONECTADOS"
      />,
    );

    expect(screen.getByRole('header', { name: 'Bancos' })).toBeOnTheScreen();
    expect(screen.getByText('3 CONECTADOS')).toBeOnTheScreen();
  });

  it('omite a contagem quando não fornecida', async () => {
    await render(<PanelHeading icon="fastfood" iconColor="#d0bcff" title="Vales (Benefícios)" />);

    expect(screen.getByRole('header', { name: 'Vales (Benefícios)' })).toBeOnTheScreen();
    expect(screen.queryByText(/CONECTADOS|ATIVOS/)).toBeNull();
  });
});
