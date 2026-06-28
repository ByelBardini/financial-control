import { fireEvent, render, screen } from '@testing-library/react-native';
import { PortfolioEvolutionChart } from '../../../src/components/investimentos/PortfolioEvolutionChart';
import type { EvolutionPoint } from '../../../src/types/investimentos';

// A interatividade (hover/crosshair/tooltip) depende de layout + ponteiro reais, que o jest não
// simula; a matemática das duas linhas é coberta em lib/cryptoChart.test (chartPointsIn). Aqui
// garantimos que monta e desenha (ramo width>0) sem quebrar com o react-native-svg.
const pontos: EvolutionPoint[] = [
  { date: '2026-06-10', marketValueCents: 100000, costBasisCents: 100000 },
  { date: '2026-06-15', marketValueCents: 240000, costBasisCents: 220000 },
  { date: '2026-06-18', marketValueCents: 260000, costBasisCents: 220000 },
];

describe('PortfolioEvolutionChart', () => {
  it('renderiza o container do gráfico', async () => {
    await render(<PortfolioEvolutionChart points={pontos} hidden={false} />);

    expect(screen.getByTestId('evolution-chart')).toBeOnTheScreen();
  });

  it('mede a largura (onLayout) e desenha as duas linhas sem quebrar', async () => {
    await render(<PortfolioEvolutionChart points={pontos} hidden={false} />);

    fireEvent(screen.getByTestId('evolution-chart'), 'layout', {
      nativeEvent: { layout: { width: 320, height: 120 } },
    });

    expect(screen.getByTestId('evolution-chart')).toBeOnTheScreen();
  });
});
