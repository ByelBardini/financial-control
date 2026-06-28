import { render, screen } from '@testing-library/react-native';
import { EvolutionSection } from '../../../src/components/investimentos/EvolutionSection';
import type { EvolutionPoint } from '../../../src/types/investimentos';

const pontos: EvolutionPoint[] = [
  { date: '2026-06-15', marketValueCents: 240000, costBasisCents: 220000 },
  { date: '2026-06-18', marketValueCents: 260000, costBasisCents: 220000 },
];

describe('EvolutionSection', () => {
  it('mostra o cabeçalho e a legenda mercado/custo', async () => {
    await render(<EvolutionSection points={pontos} hidden={false} />);

    expect(screen.getByText('Evolução do Patrimônio')).toBeOnTheScreen();
    expect(screen.getByText('Mercado')).toBeOnTheScreen();
    expect(screen.getByText('Custo')).toBeOnTheScreen();
    expect(screen.getByTestId('evolution-chart')).toBeOnTheScreen();
  });

  it('sem pontos mostra o estado vazio em vez do gráfico', async () => {
    await render(<EvolutionSection points={[]} hidden={false} />);

    expect(screen.getByText(/Sem histórico ainda/)).toBeOnTheScreen();
    expect(screen.queryByTestId('evolution-chart')).not.toBeOnTheScreen();
  });
});
