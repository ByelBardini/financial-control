import { render, screen } from '@testing-library/react-native';
import { LabeledMoney } from '../../src/components/LabeledMoney';

describe('LabeledMoney', () => {
  it('mostra o rótulo e o valor formatado', async () => {
    await render(<LabeledMoney label="Em bancos" cents={343000} />);

    expect(screen.getByText('Em bancos')).toBeOnTheScreen();
    expect(screen.getByText('R$ 3.430,00')).toBeOnTheScreen();
  });

  it('aceita um tom sem quebrar', async () => {
    await render(<LabeledMoney label="Receitas do mês" cents={520000} tone="secondary" />);

    expect(screen.getByText('Receitas do mês')).toBeOnTheScreen();
    expect(screen.getByText('R$ 5.200,00')).toBeOnTheScreen();
  });

  it('mascara o valor quando hidden', async () => {
    await render(<LabeledMoney label="Saldo líquido" cents={1843000} hidden />);

    expect(screen.queryByText('R$ 18.430,00')).toBeNull();
    expect(screen.getByLabelText('valor oculto')).toBeOnTheScreen();
  });
});
