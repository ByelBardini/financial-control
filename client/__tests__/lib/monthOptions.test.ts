import { defaultMonth, monthOptions, monthToOccurredOn } from '../../src/lib/monthOptions';

describe('monthOptions', () => {
  const now = new Date(2026, 5, 15); // Junho/2026 (mês 5, 0-based)

  it('gera de -back a +fwd, do mais antigo pro mais futuro, com rótulo PT-BR', () => {
    const opts = monthOptions(now, 2, 1); // 2 passados + atual + 1 futuro
    expect(opts.map((o) => o.value)).toEqual(['2026-04', '2026-05', '2026-06', '2026-07']);
    expect(opts.map((o) => o.label)).toEqual([
      'Abril/2026',
      'Maio/2026',
      'Junho/2026',
      'Julho/2026',
    ]);
  });

  it('back=0 (lançar fatura): mês corrente primeiro, sem passado', () => {
    const opts = monthOptions(now, 0, 2);
    expect(opts.map((o) => o.value)).toEqual(['2026-06', '2026-07', '2026-08']);
  });

  it('vira o ano ao cruzar dezembro/janeiro', () => {
    const dez = new Date(2026, 11, 10); // Dezembro/2026
    expect(monthOptions(dez, 0, 1).map((o) => o.value)).toEqual(['2026-12', '2027-01']);
  });
});

describe('defaultMonth', () => {
  it('devolve o mês corrente em YYYY-MM', () => {
    expect(defaultMonth(new Date(2026, 2, 20))).toBe('2026-03');
  });
});

describe('monthToOccurredOn', () => {
  it('converte o mês no 1º dia (competência da fatura)', () => {
    expect(monthToOccurredOn('2026-03')).toBe('2026-03-01');
  });
});
