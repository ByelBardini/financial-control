export type ChartPoint = { x: number; y: number };

const round = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

// Converte a série em pontos (x,y) dentro de width×height, com padding vertical pra a linha não
// encostar nas bordas. y é invertido (no SVG cresce pra baixo): maior valor = y menor (mais no topo).
export function chartPoints(
  series: number[],
  width: number,
  height: number,
  pad = 6,
): ChartPoint[] {
  const n = series.length;
  if (n === 0 || width <= 0 || height <= 0) return [];
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const usableH = Math.max(0, height - pad * 2);
  return series.map((value, i) => ({
    x: n === 1 ? width / 2 : round((i / (n - 1)) * width),
    y: round(pad + (1 - (value - min) / span) * usableH),
  }));
}

// "M x0 y0 L x1 y1 ..." pra a linha.
export function linePath(points: ChartPoint[]): string {
  if (points.length === 0) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}

// Linha + fecho até a base (height) pra preencher a área sob a curva.
export function areaPath(points: ChartPoint[], height: number): string {
  if (points.length === 0) return '';
  const first = points[0]!;
  const last = points[points.length - 1]!;
  return `${linePath(points)} L ${last.x} ${height} L ${first.x} ${height} Z`;
}

// Índice do ponto mais próximo do x do cursor (0..count-1), clampado às bordas.
export function nearestIndex(x: number, width: number, count: number): number {
  if (count <= 1 || width <= 0) return 0;
  return Math.round(clamp(x / width, 0, 1) * (count - 1));
}
