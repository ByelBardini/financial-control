import { render, screen, userEvent } from '@testing-library/react-native';
import { DeleteTransactionButton } from '../../../src/components/transacoes/DeleteTransactionButton';

describe('DeleteTransactionButton', () => {
  it('exige confirmação em dois passos', async () => {
    const onDelete = jest.fn();
    await render(<DeleteTransactionButton onDelete={onDelete} />);
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Excluir transação' }));
    expect(onDelete).not.toHaveBeenCalled();

    await user.press(screen.getByRole('button', { name: 'Confirmar exclusão' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('cancelar volta ao gatilho sem excluir', async () => {
    const onDelete = jest.fn();
    await render(<DeleteTransactionButton onDelete={onDelete} />);
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Excluir transação' }));
    await user.press(screen.getByRole('button', { name: 'Cancelar exclusão' }));

    expect(screen.getByRole('button', { name: 'Excluir transação' })).toBeOnTheScreen();
    expect(onDelete).not.toHaveBeenCalled();
  });
});
