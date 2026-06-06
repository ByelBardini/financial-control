import { changeTone, formatDailyChange, formatPercent } from '../../src/lib/percent';

describe('formatPercent', () => {
  it('usa vírgula (pt-BR) e sinal positivo explícito', () => {
    expect(formatPercent(8.48)).toBe('+8,48%');
    expect(formatPercent(-5.4)).toBe('-5,4%');
    expect(formatPercent(0)).toBe('0%');
  });
});

describe('formatDailyChange', () => {
  it('mostra queda com sinal negativo', () => {
    expect(formatDailyChange(-5.4)).toBe('-5,4% hoje');
  });

  it('mostra alta com sinal positivo explícito', () => {
    expect(formatDailyChange(6.2)).toBe('+6,2% hoje');
  });
});

describe('changeTone', () => {
  it.each([
    [0.01, 'secondary'],
    [-5.4, 'error'],
    [0, 'neutral'],
  ])('%f → %s', (pct, tone) => {
    expect(changeTone(pct)).toBe(tone);
  });
});
