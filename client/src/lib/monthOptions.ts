// Opções de MÊS (YYYY-MM) para o seletor de "Lançar na fatura" — a fatura é por mês de
// competência, não por dia. Rótulo PT-BR "Março/2026". Puro: recebe o `now` p/ ser testável.

const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export type MonthOption = { value: string; label: string };

// ym formata ano + mês (0-based) como "YYYY-MM".
function ym(year: number, month0: number): string {
  return `${year}-${String(month0 + 1).padStart(2, '0')}`;
}

// monthLabel monta "Março/2026" a partir de ano + mês (0-based).
function monthLabel(year: number, month0: number): string {
  return `${MONTHS[month0]}/${year}`;
}

// monthOptions gera os meses de -back a +fwd em torno de `now`, do mais futuro pro mais antigo.
export function monthOptions(now: Date, back = 6, fwd = 6): MonthOption[] {
  const out: MonthOption[] = [];
  for (let i = fwd; i >= -back; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    out.push({
      value: ym(d.getFullYear(), d.getMonth()),
      label: monthLabel(d.getFullYear(), d.getMonth()),
    });
  }
  return out;
}

// defaultMonth é o mês corrente (YYYY-MM) — pré-selecionado no seletor.
export function defaultMonth(now: Date): string {
  return ym(now.getFullYear(), now.getMonth());
}

// monthToOccurredOn converte "YYYY-MM" no 1º dia do mês ("YYYY-MM-01"), a competência da fatura.
export function monthToOccurredOn(month: string): string {
  return `${month}-01`;
}
