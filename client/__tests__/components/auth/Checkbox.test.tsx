import { render, screen, userEvent } from '@testing-library/react-native';
import { Checkbox } from '../../../src/components/auth/Checkbox';

describe('Checkbox', () => {
  it('reflete o estado desmarcado e alterna ao pressionar', async () => {
    const onChange = jest.fn();
    await render(<Checkbox label="Lembrar de mim" checked={false} onChange={onChange} />);

    const box = screen.getByRole('checkbox', { name: 'Lembrar de mim' });
    expect(box).not.toBeChecked();

    await userEvent.setup().press(box);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('reflete o estado marcado', async () => {
    await render(<Checkbox label="Lembrar de mim" checked onChange={jest.fn()} />);
    expect(screen.getByRole('checkbox', { name: 'Lembrar de mim' })).toBeChecked();
  });
});
