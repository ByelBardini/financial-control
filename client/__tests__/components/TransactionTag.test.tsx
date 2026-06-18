import { render, screen } from '@testing-library/react-native';
import { TransactionTag } from '../../src/components/TransactionTag';

describe('TransactionTag', () => {
  it('mostra o rótulo da etiqueta', async () => {
    await render(<TransactionTag label="Sobrevivência" tone="error" />);
    expect(screen.getByText('Sobrevivência')).toBeOnTheScreen();
  });

  it('renderiza qualquer tom sem quebrar', async () => {
    await render(<TransactionTag label="Inflow Esperado" tone="secondary" />);
    expect(screen.getByText('Inflow Esperado')).toBeOnTheScreen();
  });
});
