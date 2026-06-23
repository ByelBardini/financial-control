import type { IconName } from '../components/Icon';
import type { Tone } from '../types/dashboard';
import type { RiskAssessment } from '../types/investimentos';

type Tier = { level: string; tone: Tone; summary: string; quip: string };

// Faixas de desempenho → veredito ácido. Lucro = verde/tranquilo; prejuízo = vermelho/sangue.
function pickTier(gainPct: number): Tier {
  if (gainPct >= 5)
    return {
      level: 'Voando (raro)',
      tone: 'secondary',
      summary: 'Lucro de verdade. Aproveite a vista do topo.',
      quip: 'Tira print antes que o mercado lembre de você.',
    };
  if (gainPct >= 0.5)
    return {
      level: 'No Azul',
      tone: 'secondary',
      summary: 'No positivo — o desespero está sob controle.',
      quip: 'O segredo é não olhar a corretora todo santo dia.',
    };
  if (gainPct > -0.5)
    return {
      level: 'Empatando',
      tone: 'neutral',
      summary: 'Zero a zero com o mercado.',
      quip: 'Pelo menos não está pagando pra investir.',
    };
  if (gainPct > -8)
    return {
      level: 'Sangrando Devagar',
      tone: 'error',
      summary: 'No vermelho leve. Respira.',
      quip: 'Finja que é "estratégia de longo prazo".',
    };
  return {
    level: 'Hemorragia',
    tone: 'error',
    summary: 'Prejuízo considerável.',
    quip: 'Hora de rebatizar "perda" como "preço médio".',
  };
}

// Avaliação de Risco derivada do DESEMPENHO: resume se os investimentos estão indo bem ou mal a
// partir do lucro/perda geral (gainPct, em %). Status verde no lucro, vermelho no prejuízo, com
// ícone de tendência pela direção. Função pura — o backend pode computar o mesmo no futuro.
export function assessRisk(gainPct: number): RiskAssessment {
  const tier = pickTier(gainPct);
  const icon: IconName = gainPct >= 0 ? 'trending_up' : 'trending_down';
  return {
    level: tier.level,
    levelTone: tier.tone,
    icon,
    summary: tier.summary,
    resultPct: gainPct,
    quip: tier.quip,
  };
}
