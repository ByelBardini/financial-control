import { render, screen } from '@testing-library/react-native';
import { DiagnosisCard } from '../../src/components/DiagnosisCard';
import { dashboardSnapshot } from '../../src/mocks/dashboardSnapshot';

describe('DiagnosisCard', () => {
  it('mostra título e corpo do diagnóstico', async () => {
    await render(<DiagnosisCard diagnosis={dashboardSnapshot.diagnosis} />);

    expect(screen.getByText('Diagnóstico Pobrify')).toBeOnTheScreen();
    expect(screen.getByText('Você ainda não está falido. Continue assim.')).toBeOnTheScreen();
  });
});
