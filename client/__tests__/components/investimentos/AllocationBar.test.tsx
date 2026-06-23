import { render, screen } from '@testing-library/react-native';
import { AllocationBar } from '../../../src/components/investimentos/AllocationBar';
import { investimentosSnapshot } from '../../../src/mocks/investimentosSnapshot';
import { formatBRL } from '../../../src/lib/money';

const allocation = investimentosSnapshot.allocation;

describe('AllocationBar', () => {
  it('mostra cada classe com rótulo, percentual e valor', async () => {
    await render(<AllocationBar allocation={allocation} hidden={false} />);

    expect(screen.getByRole('header', { name: 'Alocação por Classe' })).toBeOnTheScreen();
    for (const slice of allocation) {
      expect(screen.getByText(slice.label)).toBeOnTheScreen();
      expect(screen.getByText(`${slice.percent}%`)).toBeOnTheScreen();
      expect(screen.getByText(formatBRL(slice.valueCents))).toBeOnTheScreen();
    }
  });

  it('não inclui cripto na alocação geral', async () => {
    await render(<AllocationBar allocation={allocation} hidden={false} />);

    expect(screen.queryByText('Bitcoin')).toBeNull();
    expect(screen.queryByText('BTC')).toBeNull();
    expect(screen.queryByText('Cripto')).toBeNull();
  });

  it('mascara os valores quando hidden', async () => {
    await render(<AllocationBar allocation={allocation} hidden={true} />);

    expect(screen.getAllByLabelText('valor oculto').length).toBe(allocation.length);
  });
});
