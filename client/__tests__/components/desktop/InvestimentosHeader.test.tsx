import { render, screen, userEvent } from '@testing-library/react-native';
import { InvestimentosHeader } from '../../../src/components/desktop/InvestimentosHeader';

describe('InvestimentosHeader (desktop)', () => {
  it('mostra eyebrow, título e a ação de novo ativo', async () => {
    await render(<InvestimentosHeader hidden={false} onToggleHidden={jest.fn()} />);

    expect(screen.getByText('Risco Máximo')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Investimentos' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Novo ativo' })).toBeOnTheScreen();
  });

  it('alterna a visibilidade dos valores', async () => {
    const onToggleHidden = jest.fn();
    await render(<InvestimentosHeader hidden={false} onToggleHidden={onToggleHidden} />);

    await userEvent.setup().press(screen.getByRole('switch', { name: 'Ocultar valores' }));
    expect(onToggleHidden).toHaveBeenCalledTimes(1);
  });

  it('dispara onCreateAsset ao tocar em "Novo ativo"', async () => {
    const onCreateAsset = jest.fn();
    await render(
      <InvestimentosHeader
        hidden={false}
        onToggleHidden={jest.fn()}
        onCreateAsset={onCreateAsset}
      />,
    );

    await userEvent.setup().press(screen.getByRole('button', { name: 'Novo ativo' }));
    expect(onCreateAsset).toHaveBeenCalledTimes(1);
  });
});
