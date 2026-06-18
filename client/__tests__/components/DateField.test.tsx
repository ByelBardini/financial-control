import { render, screen } from '@testing-library/react-native';
import { DateField } from '../../src/components/DateField';

// jest resolve a variante nativa (DateField.tsx); o datetimepicker é mockado no jest.setup.
// O fluxo de seleção de data (from/to → filtro) é coberto em useTransactionFilters/api.
describe('DateField (nativo)', () => {
  it('vazio mostra "Selecionar" + o rótulo acessível', async () => {
    await render(<DateField label="De" value="" onChange={jest.fn()} />);
    expect(screen.getByText('De')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'De: selecionar data' })).toBeOnTheScreen();
  });

  it('mostra a data quando há valor', async () => {
    await render(<DateField label="Até" value="2026-02-20" onChange={jest.fn()} />);
    expect(screen.getByText('2026-02-20')).toBeOnTheScreen();
  });
});
