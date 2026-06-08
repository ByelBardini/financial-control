import { render, screen, userEvent } from '@testing-library/react-native';
import { MoneyField } from '../../../src/components/contas/MoneyField';

describe('MoneyField', () => {
  it('acumula centavos da direita pra esquerda ao digitar', async () => {
    const onChangeCents = jest.fn();
    await render(<MoneyField label="Saldo inicial" valueCents={0} onChangeCents={onChangeCents} />);

    await userEvent.setup().type(screen.getByLabelText('Saldo inicial'), '100');

    expect(onChangeCents).toHaveBeenLastCalledWith(100);
    expect(screen.getByDisplayValue('1,00')).toBeOnTheScreen();
  });

  it('mostra o "R$" fixo', async () => {
    await render(<MoneyField label="Saldo inicial" valueCents={0} onChangeCents={jest.fn()} />);

    expect(screen.getByText('R$')).toBeOnTheScreen();
  });

  it('pré-preenche o texto a partir dos centavos', async () => {
    await render(<MoneyField label="Limite" valueCents={500000} onChangeCents={jest.fn()} />);

    expect(screen.getByDisplayValue('5.000,00')).toBeOnTheScreen();
  });

  it('mostra a mensagem de erro', async () => {
    await render(
      <MoneyField
        label="Limite"
        valueCents={0}
        onChangeCents={jest.fn()}
        error="Limite obrigatório"
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Limite obrigatório');
  });
});
