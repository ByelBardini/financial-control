import { render, screen, userEvent } from '@testing-library/react-native';
import { ValesPanel } from '../../../src/components/desktop/ValesPanel';
import { contasSnapshot } from '../../../src/mocks/contasSnapshot';

describe('ValesPanel (desktop)', () => {
  it('mostra o título e os vales', async () => {
    await render(<ValesPanel vouchers={contasSnapshot.vouchers} hidden={false} />);

    expect(screen.getByRole('header', { name: 'Vales (Benefícios)' })).toBeOnTheScreen();
    expect(screen.getByText('Alelo Refeição')).toBeOnTheScreen();
    expect(screen.getByText('Ticket Alimentação')).toBeOnTheScreen();
    expect(screen.getByText('R$ 215,00')).toBeOnTheScreen();
    expect(screen.getByText('R$ 12,30')).toBeOnTheScreen();
  });

  it('encaminha o id do vale tocado para onEditAccount', async () => {
    const onEditAccount = jest.fn();
    await render(
      <ValesPanel
        vouchers={contasSnapshot.vouchers}
        hidden={false}
        onEditAccount={onEditAccount}
      />,
    );

    await userEvent.setup().press(screen.getByRole('button', { name: 'Editar Alelo Refeição' }));
    expect(onEditAccount).toHaveBeenCalledWith('alelo');
  });
});
