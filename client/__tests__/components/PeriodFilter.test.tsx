import { render, screen, userEvent } from '@testing-library/react-native';
import { PeriodFilter } from '../../src/components/PeriodFilter';

const noops = () => ({ onChange: jest.fn(), onFromChange: jest.fn(), onToChange: jest.fn() });

describe('PeriodFilter', () => {
  it('mostra o período atual e escolhe um preset (fecha)', async () => {
    const h = noops();
    await render(<PeriodFilter value="30d" from="" to="" {...h} />);
    expect(screen.getByRole('button', { name: 'Período: 30 Dias' })).toBeOnTheScreen();

    const user = userEvent.setup();
    await user.press(screen.getByRole('button', { name: 'Período: 30 Dias' }));
    await user.press(screen.getByRole('menuitem', { name: '3 Meses' }));
    expect(h.onChange).toHaveBeenCalledWith('3m');
  });

  it('Personalizado revela os campos De/Até', async () => {
    await render(<PeriodFilter value="custom" from="" to="" {...noops()} />);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Período: Personalizado' }));

    expect(screen.getByLabelText('De: selecionar data')).toBeOnTheScreen();
    expect(screen.getByLabelText('Até: selecionar data')).toBeOnTheScreen();
  });
});
