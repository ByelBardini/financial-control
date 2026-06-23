import { fireEvent, render, screen } from '@testing-library/react-native';
import { CryptoChart } from '../../../src/components/investimentos/CryptoChart';

// A interatividade (hover/crosshair/tooltip) depende de layout + ponteiro reais, que o jest não
// simula; a matemática do gráfico é coberta em lib/cryptoChart.test. Aqui garantimos que o
// componente monta e desenha (ramo width>0) sem quebrar com o react-native-svg.
describe('CryptoChart', () => {
  it('renderiza o container do gráfico', async () => {
    await render(<CryptoChart series={[1, 2, 3]} tone="secondary" hidden={false} />);

    expect(screen.getByTestId('crypto-chart')).toBeOnTheScreen();
  });

  it('mede a largura (onLayout) e desenha sem quebrar', async () => {
    await render(<CryptoChart series={[1, 2, 3, 4, 5]} tone="error" hidden={false} />);

    fireEvent(screen.getByTestId('crypto-chart'), 'layout', {
      nativeEvent: { layout: { width: 240, height: 72 } },
    });

    expect(screen.getByTestId('crypto-chart')).toBeOnTheScreen();
  });
});
