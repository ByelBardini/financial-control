import { render, screen } from '@testing-library/react-native';
import { ProgressBar } from '../../src/components/ProgressBar';

describe('ProgressBar', () => {
  it('comunica o valor (0–100) ao leitor de tela', async () => {
    await render(<ProgressBar percent={85} tone="error" />);
    expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({
      now: 85,
      min: 0,
      max: 100,
    });
  });

  it('limita o preenchimento a no máximo 100%', async () => {
    await render(<ProgressBar percent={150} tone="primary" testID="fill" />);
    expect(screen.getByTestId('fill')).toHaveStyle({ width: '100%' });
  });
});
