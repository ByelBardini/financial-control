import { render, screen, userEvent } from '@testing-library/react-native';
import { TopBar } from '../../src/components/TopBar';

describe('TopBar', () => {
  it('mostra a marca e um toggle acessível que dispara onToggleHidden', async () => {
    const onToggleHidden = jest.fn();
    await render(<TopBar hidden={false} onToggleHidden={onToggleHidden} />);

    expect(screen.getByText('Pobrify')).toBeOnTheScreen();
    const toggle = screen.getByRole('switch', { name: 'Ocultar valores' });
    expect(toggle).not.toBeChecked();

    await userEvent.setup().press(toggle);
    expect(onToggleHidden).toHaveBeenCalledTimes(1);
  });

  it('reflete o estado oculto no rótulo e no estado de acessibilidade', async () => {
    await render(<TopBar hidden onToggleHidden={jest.fn()} />);
    const toggle = screen.getByRole('switch', { name: 'Mostrar valores' });
    expect(toggle).toBeChecked();
  });
});
