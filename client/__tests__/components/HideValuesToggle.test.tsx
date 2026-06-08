import { render, screen, userEvent } from '@testing-library/react-native';
import { HideValuesToggle } from '../../src/components/HideValuesToggle';

describe('HideValuesToggle', () => {
  it('mostra "Ocultar Valores" e não-checado quando os valores estão visíveis', async () => {
    await render(<HideValuesToggle hidden={false} onToggleHidden={jest.fn()} />);

    const toggle = screen.getByRole('switch', { name: 'Ocultar valores' });
    expect(toggle).toBeOnTheScreen();
    expect(toggle).not.toBeChecked();
    expect(screen.getByText('Ocultar Valores')).toBeOnTheScreen();
  });

  it('mostra "Mostrar Valores" e checado quando os valores estão ocultos', async () => {
    await render(<HideValuesToggle hidden onToggleHidden={jest.fn()} />);

    const toggle = screen.getByRole('switch', { name: 'Mostrar valores' });
    expect(toggle).toBeChecked();
    expect(screen.getByText('Mostrar Valores')).toBeOnTheScreen();
  });

  it('dispara onToggleHidden ao tocar', async () => {
    const onToggleHidden = jest.fn();
    await render(<HideValuesToggle hidden={false} onToggleHidden={onToggleHidden} />);

    await userEvent.setup().press(screen.getByRole('switch', { name: 'Ocultar valores' }));

    expect(onToggleHidden).toHaveBeenCalledTimes(1);
  });
});
