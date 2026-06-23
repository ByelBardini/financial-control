import { areaPath, chartPoints, linePath, nearestIndex } from '../../src/lib/cryptoChart';

describe('cryptoChart helpers', () => {
  it('chartPoints distribui x igualmente e inverte y (maior valor no topo)', () => {
    const points = chartPoints([1, 2, 3], 100, 50, 0);

    expect(points).toHaveLength(3);
    expect(points[0]!.x).toBe(0);
    expect(points[2]!.x).toBe(100);
    expect(points[2]!.y).toBeLessThan(points[0]!.y); // valor 3 (maior) fica no topo (y menor)
  });

  it('chartPoints retorna [] com width 0 ou série vazia', () => {
    expect(chartPoints([1, 2], 0, 50)).toEqual([]);
    expect(chartPoints([], 100, 50)).toEqual([]);
  });

  it('linePath começa com M e usa L nos demais pontos', () => {
    const d = linePath([
      { x: 0, y: 0 },
      { x: 10, y: 5 },
    ]);

    expect(d.startsWith('M 0 0')).toBe(true);
    expect(d).toContain('L 10 5');
  });

  it('areaPath fecha a forma até a base e termina com Z', () => {
    const d = areaPath(
      [
        { x: 0, y: 0 },
        { x: 10, y: 5 },
      ],
      50,
    );

    expect(d).toContain('L 10 50'); // desce até a base
    expect(d.endsWith('Z')).toBe(true);
  });

  it('nearestIndex mapeia o x do cursor pro índice mais próximo (clampado)', () => {
    expect(nearestIndex(0, 100, 5)).toBe(0);
    expect(nearestIndex(100, 100, 5)).toBe(4);
    expect(nearestIndex(50, 100, 5)).toBe(2);
    expect(nearestIndex(-20, 100, 5)).toBe(0);
  });
});
