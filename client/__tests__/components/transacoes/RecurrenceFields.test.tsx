import { render, screen, userEvent } from '@testing-library/react-native';
import {
  RecurrenceFields,
  type RecurrenceValues,
} from '../../../src/components/transacoes/RecurrenceFields';

const base: RecurrenceValues = {
  frequency: 'monthly',
  endMode: 'forever',
  endDate: '',
  occurrences: 12,
};

describe('RecurrenceFields', () => {
  it('indefinido: não mostra data nem repetições', async () => {
    await render(<RecurrenceFields values={base} onChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Indefinido' })).toBeSelected();
    expect(screen.queryByLabelText(/^Até:/)).toBeNull();
    expect(screen.queryByLabelText(/^Repetições:/)).toBeNull();
  });

  it('"Até data" revela o campo de data', async () => {
    const onChange = jest.fn();
    await render(<RecurrenceFields values={base} onChange={onChange} />);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Até data' }));
    expect(onChange).toHaveBeenCalledWith({ endMode: 'until' });
  });

  it('"Nº de vezes" revela o seletor de repetições e escolhe', async () => {
    const onChange = jest.fn();
    await render(<RecurrenceFields values={{ ...base, endMode: 'count' }} onChange={onChange} />);
    const user = userEvent.setup();

    await user.press(screen.getByLabelText(/^Repetições:/));
    await user.press(screen.getByRole('menuitem', { name: '6×' }));
    expect(onChange).toHaveBeenCalledWith({ occurrences: 6 });
  });

  it('troca a frequência', async () => {
    const onChange = jest.fn();
    await render(<RecurrenceFields values={base} onChange={onChange} />);
    const user = userEvent.setup();

    await user.press(screen.getByLabelText(/^Frequência:/));
    await user.press(screen.getByRole('menuitem', { name: 'Semanal' }));
    expect(onChange).toHaveBeenCalledWith({ frequency: 'weekly' });
  });
});
