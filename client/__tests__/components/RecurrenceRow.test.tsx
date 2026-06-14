import { render, screen } from '@testing-library/react-native';
import { RecurrenceRow } from '../../src/components/RecurrenceRow';
import { transacoesSnapshot } from '../../src/mocks/transacoesSnapshot';

const salario = transacoesSnapshot.recurrences.find((r) => r.id === 'salario')!;
const netflix = transacoesSnapshot.recurrences.find((r) => r.id === 'netflix')!;

describe('RecurrenceRow', () => {
  it('mostra receita recorrente com sinal positivo', async () => {
    await render(<RecurrenceRow recurrence={salario} hidden={false} />);

    expect(screen.getByText('Salário Base')).toBeOnTheScreen();
    expect(screen.getByText('Receita Fixa')).toBeOnTheScreen();
    expect(screen.getByText('+ R$ 5.000,00')).toBeOnTheScreen();
  });

  it('mostra assinatura recorrente com sinal negativo', async () => {
    await render(<RecurrenceRow recurrence={netflix} hidden={false} />);

    expect(screen.getByText('Netflix 4K')).toBeOnTheScreen();
    expect(screen.getByText('- R$ 55,90')).toBeOnTheScreen();
  });

  it('mascara o valor quando hidden', async () => {
    await render(<RecurrenceRow recurrence={netflix} hidden />);

    expect(screen.queryByText('- R$ 55,90')).toBeNull();
    expect(screen.getByLabelText('valor oculto')).toBeOnTheScreen();
  });
});
