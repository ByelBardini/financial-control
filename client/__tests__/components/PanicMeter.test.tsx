import { render, screen } from '@testing-library/react-native';
import { PanicMeter } from '../../src/components/PanicMeter';
import type { PanicMeter as PanicMeterData } from '../../src/types/contas';

const panic: PanicMeterData = {
  percent: 85,
  levelLabel: 'Crítico',
  levelTone: 'error',
  lowLabel: 'Tranquilo',
  highLabel: 'Colapso',
  note: '4 dias restantes até a falência total.',
};

describe('PanicMeter', () => {
  it('anuncia o valor e mostra nível, extremos, caption e nota', async () => {
    await render(<PanicMeter panic={panic} caption="Tempo Estimado de Vida (Bancária)" />);

    expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ now: 85, min: 0, max: 100 });
    expect(screen.getByText('Crítico')).toBeOnTheScreen();
    expect(screen.getByText('Tranquilo')).toBeOnTheScreen();
    expect(screen.getByText('Colapso')).toBeOnTheScreen();
    expect(screen.getByText('Tempo Estimado de Vida (Bancária)')).toBeOnTheScreen();
    expect(screen.getByText('4 dias restantes até a falência total.')).toBeOnTheScreen();
  });
});
