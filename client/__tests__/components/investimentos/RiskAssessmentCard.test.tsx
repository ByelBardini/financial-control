import { render, screen } from '@testing-library/react-native';
import { RiskAssessmentCard } from '../../../src/components/investimentos/RiskAssessmentCard';
import { investimentosSnapshot } from '../../../src/mocks/investimentosSnapshot';
import { formatPercent } from '../../../src/lib/percent';

const risk = investimentosSnapshot.risk;

describe('RiskAssessmentCard', () => {
  it('mostra o veredito (status, resumo, resultado e frase) derivado do lucro/perda', async () => {
    await render(<RiskAssessmentCard risk={risk} />);

    expect(screen.getByText('Avaliação de Risco')).toBeOnTheScreen();
    expect(screen.getByText(risk.level)).toBeOnTheScreen();
    expect(screen.getByText(risk.summary)).toBeOnTheScreen();
    expect(screen.getByText(`Resultado geral: ${formatPercent(risk.resultPct)}`)).toBeOnTheScreen();
    expect(screen.getByText(`"${risk.quip}"`)).toBeOnTheScreen();
  });

  it('não usa mais a barra de pânico (sem progressbar)', async () => {
    await render(<RiskAssessmentCard risk={risk} />);

    expect(screen.queryByRole('progressbar')).toBeNull();
  });
});
