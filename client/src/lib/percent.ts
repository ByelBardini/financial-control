import type { Tone } from '../types/dashboard';

// "+6,2%" / "-5,4%" — sinal positivo explícito, decimal com vírgula (pt-BR).
export function formatPercent(pct: number): string {
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toString().replace('.', ',')}%`;
}

// "+6,2% hoje" — variação diária usada nas linhas de investimento do mobile.
export function formatDailyChange(pct: number): string {
  return `${formatPercent(pct)} hoje`;
}

// Verde sobe, vermelho cai, neutro estável.
export function changeTone(pct: number): Tone {
  if (pct > 0) return 'secondary';
  if (pct < 0) return 'error';
  return 'neutral';
}
