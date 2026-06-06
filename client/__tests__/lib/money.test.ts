import { formatBRL } from '../../src/lib/money';

describe('formatBRL', () => {
  it.each([
    [4250, 'R$ 42,50'],
    [320000, 'R$ 3.200,00'],
    [191550, 'R$ 1.915,50'],
    [120000, 'R$ 1.200,00'],
    [0, 'R$ 0,00'],
  ])('formata %i centavos como "%s"', (cents, expected) => {
    expect(formatBRL(cents)).toBe(expected);
  });

  it('normaliza o espaço do Intl (sem NBSP/narrow-NBSP)', () => {
    expect(formatBRL(4250)).not.toMatch(/[  ]/);
  });
});
