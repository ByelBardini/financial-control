import { render, screen, userEvent } from '@testing-library/react-native';
import { BancosPanel } from '../../../src/components/desktop/BancosPanel';
import { contasSnapshot } from '../../../src/mocks/contasSnapshot';

describe('BancosPanel (desktop)', () => {
  it('mostra o título, a contagem e as contas', async () => {
    await render(<BancosPanel accounts={contasSnapshot.banks} hidden={false} />);

    expect(screen.getByRole('header', { name: 'Bancos' })).toBeOnTheScreen();
    expect(screen.getByText('3 CONECTADOS')).toBeOnTheScreen();
    expect(screen.getByText('Nubank')).toBeOnTheScreen();
    expect(screen.getByText('Itaú Personnalité')).toBeOnTheScreen();
  });

  it('encaminha o id da conta tocada para onEditAccount', async () => {
    const onEditAccount = jest.fn();
    await render(
      <BancosPanel accounts={contasSnapshot.banks} hidden={false} onEditAccount={onEditAccount} />,
    );

    await userEvent.setup().press(screen.getByRole('button', { name: 'Editar Nubank' }));
    expect(onEditAccount).toHaveBeenCalledWith('nubank');
  });
});
