import { render, screen, userEvent } from '@testing-library/react-native';
import { BankAccountRow } from '../../../src/components/desktop/BankAccountRow';
import { contasSnapshot } from '../../../src/mocks/contasSnapshot';

const [nubank] = contasSnapshot.banks;

describe('BankAccountRow (desktop)', () => {
  it('mostra nome, subtítulo, saldo e nota', async () => {
    await render(<BankAccountRow account={nubank} hidden={false} />);

    expect(screen.getByText('Nubank')).toBeOnTheScreen();
    expect(screen.getByText('Conta Corrente • Final 4022')).toBeOnTheScreen();
    expect(screen.getByText('R$ 842,20')).toBeOnTheScreen();
    expect(screen.getByText('Sincronizado há 2 minutos - Infelizmente')).toBeOnTheScreen();
  });

  it('mascara o saldo quando hidden', async () => {
    await render(<BankAccountRow account={nubank} hidden />);

    expect(screen.queryByText('R$ 842,20')).toBeNull();
    expect(screen.getByLabelText('valor oculto')).toBeOnTheScreen();
  });

  it('o corpo vira "Transferir de {conta}" e a engrenagem "Editar {conta}"', async () => {
    const onPress = jest.fn();
    const onEdit = jest.fn();
    await render(
      <BankAccountRow account={nubank} hidden={false} onPress={onPress} onEdit={onEdit} />,
    );
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Transferir de Nubank' }));
    expect(onPress).toHaveBeenCalledTimes(1);

    await user.press(screen.getByRole('button', { name: 'Editar Nubank' }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });
});
