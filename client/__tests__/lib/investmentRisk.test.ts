import { assessRisk } from '../../src/lib/investmentRisk';

describe('assessRisk (veredito derivado do lucro/perda)', () => {
  it('lucro forte → status verde (secundário) e ícone de alta', () => {
    const risk = assessRisk(12);

    expect(risk.levelTone).toBe('secondary');
    expect(risk.icon).toBe('trending_up');
    expect(risk.resultPct).toBe(12);
  });

  it('prejuízo feio → status vermelho (erro), ícone de baixa e nível "Hemorragia"', () => {
    const risk = assessRisk(-16);

    expect(risk.levelTone).toBe('error');
    expect(risk.icon).toBe('trending_down');
    expect(risk.level).toBe('Hemorragia');
  });

  it('perto de zero → "Empatando", tom neutro', () => {
    const risk = assessRisk(0);

    expect(risk.level).toBe('Empatando');
    expect(risk.levelTone).toBe('neutral');
  });
});
