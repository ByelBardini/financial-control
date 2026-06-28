// Formatação de datas dos gráficos (puro, sem RN/Intl — determinístico p/ teste, sem o problema de
// espaço do Intl que o money.ts contorna). Entrada é a data ISO `YYYY-MM-DD` do backend.

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// "2026-06-15" → "15 jun 2026" (tooltip). ISO inválida volta como veio.
export function formatChartDay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const [, year, month, day] = m;
  return `${Number(day)} ${MESES[Number(month) - 1]} ${year}`;
}

// "2026-06-15" → "jun/26" (rótulo de eixo, compacto). ISO inválida volta como veio.
export function formatChartMonth(iso: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const [, year, month] = m;
  return `${MESES[Number(month) - 1]}/${year.slice(2)}`;
}
