import { render, screen, userEvent } from '@testing-library/react-native';
import { TransactionSpeedDial } from '../../../src/components/transacoes/TransactionSpeedDial';

describe('TransactionSpeedDial', () => {
  it('fechado mostra só o gatilho; abrir revela Receita/Despesa', async () => {
    await render(<TransactionSpeedDial onPick={jest.fn()} />);
    const user = userEvent.setup();

    expect(screen.queryByRole('button', { name: 'Despesa' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Receita' })).toBeNull();

    await user.press(screen.getByRole('button', { name: 'Nova transação' }));
    expect(screen.getByRole('button', { name: 'Despesa' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Receita' })).toBeOnTheScreen();
  });

  it('escolher Despesa devolve outflow; Receita devolve inflow', async () => {
    const onPick = jest.fn();
    await render(<TransactionSpeedDial onPick={onPick} />);
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Nova transação' }));
    await user.press(screen.getByRole('button', { name: 'Despesa' }));
    expect(onPick).toHaveBeenCalledWith('outflow');

    await user.press(screen.getByRole('button', { name: 'Nova transação' }));
    await user.press(screen.getByRole('button', { name: 'Receita' }));
    expect(onPick).toHaveBeenCalledWith('inflow');
  });

  it('o backdrop fecha sem escolher', async () => {
    const onPick = jest.fn();
    await render(<TransactionSpeedDial onPick={onPick} />);
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Nova transação' }));
    await user.press(screen.getByRole('button', { name: 'Fechar' }));

    expect(screen.queryByRole('button', { name: 'Despesa' })).toBeNull();
    expect(onPick).not.toHaveBeenCalled();
  });
});
