import { render, screen, userEvent } from '@testing-library/react-native';
import { AccountTypeSelect } from '../../../src/components/contas/AccountTypeSelect';

describe('AccountTypeSelect', () => {
  it('mostra os quatro tipos e marca o selecionado', async () => {
    await render(<AccountTypeSelect value="checking" onChange={jest.fn()} />);

    for (const label of ['Banco', 'Vale', 'Cartão', 'Dinheiro']) {
      expect(screen.getByRole('button', { name: label })).toBeOnTheScreen();
    }
    expect(screen.getByRole('button', { name: 'Banco' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Vale' })).not.toBeSelected();
  });

  it('dispara onChange ao tocar num tipo', async () => {
    const onChange = jest.fn();
    await render(<AccountTypeSelect value="checking" onChange={onChange} />);

    await userEvent.setup().press(screen.getByRole('button', { name: 'Cartão' }));

    expect(onChange).toHaveBeenCalledWith('credit_card');
  });
});
