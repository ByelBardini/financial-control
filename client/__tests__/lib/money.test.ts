import { digitsToCents, formatBRL, formatCentsInput } from '../../src/lib/money';

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

describe('formatCentsInput', () => {
  it.each([
    [1, '0,01'],
    [10, '0,10'],
    [100, '1,00'],
    [1250, '12,50'],
    [500000, '5.000,00'],
    [0, ''],
  ])('formata %i centavos como máscara "%s"', (cents, expected) => {
    expect(formatCentsInput(cents)).toBe(expected);
  });
});

describe('digitsToCents', () => {
  it.each([
    ['1', 1],
    ['10', 10],
    ['100', 100],
    ['0,01', 1],
    ['1.234,56', 123456],
    ['R$ 5,00', 500],
    ['', 0],
    ['abc', 0],
  ])('lê %j como %i centavos (acumula da direita)', (text, expected) => {
    expect(digitsToCents(text as string)).toBe(expected);
  });
});
