import { formatChartDay, formatChartMonth } from '../../src/lib/chartDate';

describe('chartDate', () => {
  it('formatChartDay → "15 jun 2026"', () => {
    expect(formatChartDay('2026-06-15')).toBe('15 jun 2026');
  });

  it('formatChartDay sem zero à esquerda no dia', () => {
    expect(formatChartDay('2026-01-05')).toBe('5 jan 2026');
  });

  it('formatChartMonth → "jun/26"', () => {
    expect(formatChartMonth('2026-06-15')).toBe('jun/26');
  });

  it('ISO inválida volta como veio', () => {
    expect(formatChartDay('xx')).toBe('xx');
    expect(formatChartMonth('')).toBe('');
  });
});
