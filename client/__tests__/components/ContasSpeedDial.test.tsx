import { render, screen, userEvent } from '@testing-library/react-native';
import { ContasSpeedDial } from '../../src/components/ContasSpeedDial';

describe('ContasSpeedDial', () => {
  it('fica fechado por padrão e expande em Transferir / Nova conta', async () => {
    const onCreate = jest.fn();
    const onTransfer = jest.fn();
    await render(<ContasSpeedDial onCreate={onCreate} onTransfer={onTransfer} />);
    const user = userEvent.setup();

    // Fechado: as ações não aparecem.
    expect(screen.queryByRole('button', { name: 'Nova conta' })).toBeNull();

    await user.press(screen.getByRole('button', { name: 'Ações da conta' }));
    await user.press(screen.getByRole('button', { name: 'Transferir' }));
    expect(onTransfer).toHaveBeenCalledTimes(1);

    // Fecha ao escolher; reabre e cria.
    await user.press(screen.getByRole('button', { name: 'Ações da conta' }));
    await user.press(screen.getByRole('button', { name: 'Nova conta' }));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });
});
