import { render, screen, userEvent } from '@testing-library/react-native';
import { EntryKindSelect } from '../../../src/components/transacoes/EntryKindSelect';

describe('EntryKindSelect', () => {
  it('marca o tipo atual como selecionado', async () => {
    await render(<EntryKindSelect value="unico" direction="outflow" onChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Único' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Parcelado' })).not.toBeSelected();
  });

  it('troca o tipo ao tocar (Parcelado e Fixo)', async () => {
    const onChange = jest.fn();
    await render(<EntryKindSelect value="unico" direction="outflow" onChange={onChange} />);
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Parcelado' }));
    expect(onChange).toHaveBeenCalledWith('parcelado');

    await user.press(screen.getByRole('button', { name: 'Fixo' }));
    expect(onChange).toHaveBeenCalledWith('fixo');
  });

  it('esconde Parcelado quando o sentido é Receita (inflow); mostra em Despesa', async () => {
    const { rerender } = await render(
      <EntryKindSelect value="unico" direction="inflow" onChange={jest.fn()} />,
    );
    expect(screen.queryByRole('button', { name: 'Parcelado' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Único' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Fixo' })).toBeOnTheScreen();

    await rerender(<EntryKindSelect value="unico" direction="outflow" onChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Parcelado' })).toBeOnTheScreen();
  });
});
