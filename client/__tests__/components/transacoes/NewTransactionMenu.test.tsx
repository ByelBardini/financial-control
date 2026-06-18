import { render, screen, userEvent } from '@testing-library/react-native';
import { NewTransactionMenu } from '../../../src/components/transacoes/NewTransactionMenu';

describe('NewTransactionMenu', () => {
  it('escolher Despesa devolve outflow; Receita devolve inflow', async () => {
    const onPick = jest.fn();
    await render(<NewTransactionMenu visible onPick={onPick} onClose={jest.fn()} />);
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Despesa' }));
    expect(onPick).toHaveBeenCalledWith('outflow');

    await user.press(screen.getByRole('button', { name: 'Receita' }));
    expect(onPick).toHaveBeenCalledWith('inflow');
  });

  it('o backdrop fecha o menu', async () => {
    const onClose = jest.fn();
    await render(<NewTransactionMenu visible onPick={jest.fn()} onClose={onClose} />);
    await userEvent.setup().press(screen.getByLabelText('Fechar'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
