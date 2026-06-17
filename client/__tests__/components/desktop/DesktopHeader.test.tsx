import { render, screen, userEvent } from '@testing-library/react-native';
import { DesktopHeader } from '../../../src/components/desktop/DesktopHeader';

describe('DesktopHeader', () => {
  it('mostra título e ação, e dispara o toggle de ocultar valores', async () => {
    const onToggleHidden = jest.fn();
    await render(<DesktopHeader hidden={false} onToggleHidden={onToggleHidden} />);

    expect(screen.getByText('Visão Geral')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Nova transação' })).toBeOnTheScreen();

    await userEvent.setup().press(screen.getByRole('switch', { name: 'Ocultar valores' }));
    expect(onToggleHidden).toHaveBeenCalledTimes(1);
  });

  it('dispara onCreate ao tocar em "Nova transação"', async () => {
    const onCreate = jest.fn();
    await render(
      <DesktopHeader hidden={false} onToggleHidden={jest.fn()} onCreate={onCreate} />,
    );

    await userEvent.setup().press(screen.getByRole('button', { name: 'Nova transação' }));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });
});
