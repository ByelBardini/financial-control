import { render, screen, userEvent } from '@testing-library/react-native';
import { ContasHeader } from '../../../src/components/desktop/ContasHeader';

describe('ContasHeader (desktop)', () => {
  it('mostra o título e a ação, sem patrimônio líquido', async () => {
    await render(<ContasHeader hidden={false} onToggleHidden={jest.fn()} />);

    expect(screen.getByText('Monitor de Sobrevivência')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Suas contas' })).toBeOnTheScreen();
    expect(screen.getByText('Nova conta')).toBeOnTheScreen();
    expect(screen.queryByText('Patrimônio Líquido')).toBeNull();
  });

  it('alterna a visibilidade dos valores', async () => {
    const onToggleHidden = jest.fn();
    await render(<ContasHeader hidden={false} onToggleHidden={onToggleHidden} />);

    await userEvent.setup().press(screen.getByRole('switch', { name: 'Ocultar valores' }));

    expect(onToggleHidden).toHaveBeenCalledTimes(1);
  });

  it('dispara onCreateAccount ao tocar em "Nova conta"', async () => {
    const onCreateAccount = jest.fn();
    await render(
      <ContasHeader hidden={false} onToggleHidden={jest.fn()} onCreateAccount={onCreateAccount} />,
    );

    await userEvent.setup().press(screen.getByRole('button', { name: 'Nova conta' }));

    expect(onCreateAccount).toHaveBeenCalledTimes(1);
  });
});
