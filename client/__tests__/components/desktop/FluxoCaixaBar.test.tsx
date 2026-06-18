import { render, screen } from '@testing-library/react-native';
import { FluxoCaixaBar } from '../../../src/components/desktop/FluxoCaixaBar';
import { transacoesSnapshot } from '../../../src/mocks/transacoesSnapshot';

const { summary } = transacoesSnapshot;

describe('FluxoCaixaBar (desktop)', () => {
  it('mostra a faixa de fluxo de caixa e a previsão de colapso', async () => {
    await render(<FluxoCaixaBar summary={summary} hidden={false} />);

    expect(screen.getByText('FLUXO DE CAIXA OPERACIONAL')).toBeOnTheScreen();
    expect(screen.getByText('R$ 4.250,00')).toBeOnTheScreen();
    expect(screen.getByText('R$ 5.890,22')).toBeOnTheScreen();
    expect(screen.getByText('Previsão de Colapso')).toBeOnTheScreen();
    expect(screen.getByText('8 Dias')).toBeOnTheScreen();
  });

  it('mascara os valores quando hidden', async () => {
    await render(<FluxoCaixaBar summary={summary} hidden />);

    expect(screen.queryByText('R$ 4.250,00')).toBeNull();
    expect(screen.getAllByLabelText('valor oculto').length).toBeGreaterThan(0);
  });
});
