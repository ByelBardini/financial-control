import { screen } from '@testing-library/react-native';
import { RecurrenceRow } from '../../src/components/RecurrenceRow';
import { transacoesSnapshot } from '../../src/mocks/transacoesSnapshot';
import { renderWithClient } from '../_support/renderWithClient';

const salario = transacoesSnapshot.recurrences.find((r) => r.id === 'salario')!; // inflow, isDue
const netflix = transacoesSnapshot.recurrences.find((r) => r.id === 'netflix')!; // outflow, isDue
const dividendos = transacoesSnapshot.recurrences.find((r) => r.id === 'dividendos')!; // não devida

describe('RecurrenceRow', () => {
  it('mostra receita recorrente com sinal positivo', async () => {
    await renderWithClient(<RecurrenceRow recurrence={salario} hidden={false} />);

    expect(screen.getByText('Salário Base')).toBeOnTheScreen();
    expect(screen.getByText('Receita Fixa')).toBeOnTheScreen();
    expect(screen.getByText('+ R$ 5.000,00')).toBeOnTheScreen();
  });

  it('mostra assinatura recorrente com sinal negativo', async () => {
    await renderWithClient(<RecurrenceRow recurrence={netflix} hidden={false} />);

    expect(screen.getByText('Netflix 4K')).toBeOnTheScreen();
    expect(screen.getByText('- R$ 55,90')).toBeOnTheScreen();
  });

  it('mascara o valor quando hidden', async () => {
    await renderWithClient(<RecurrenceRow recurrence={netflix} hidden />);

    expect(screen.queryByText('- R$ 55,90')).toBeNull();
    expect(screen.getByLabelText('valor oculto')).toBeOnTheScreen();
  });

  it('mostra o botão "Registrar" quando devido — rótulo pelo sentido', async () => {
    await renderWithClient(<RecurrenceRow recurrence={salario} hidden={false} />);
    expect(screen.getByRole('button', { name: 'Registrar recebimento' })).toBeOnTheScreen();

    await renderWithClient(<RecurrenceRow recurrence={netflix} hidden={false} />);
    expect(screen.getByRole('button', { name: 'Registrar pagamento' })).toBeOnTheScreen();
  });

  it('esconde o botão quando não está devido', async () => {
    await renderWithClient(<RecurrenceRow recurrence={dividendos} hidden={false} />);

    expect(screen.queryByRole('button', { name: 'Registrar recebimento' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Registrar pagamento' })).toBeNull();
  });
});
