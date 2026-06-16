import { render, screen, userEvent } from '@testing-library/react-native';
import { TransactionRow } from '../../src/components/TransactionRow';
import { transacoesSnapshot } from '../../src/mocks/transacoesSnapshot';

const [ifood] = transacoesSnapshot.transactions;

describe('TransactionRow (card mobile)', () => {
  it('mostra título, etiqueta, valor e horário', async () => {
    await render(<TransactionRow transaction={ifood} hidden={false} />);

    expect(screen.getByText('iFood - "Só hoje"')).toBeOnTheScreen();
    expect(screen.getByText('Sobrevivência')).toBeOnTheScreen();
    expect(screen.getByText('- R$ 89,90')).toBeOnTheScreen();
    expect(screen.getByText('12:45')).toBeOnTheScreen();
  });

  it('mascara o valor quando hidden', async () => {
    await render(<TransactionRow transaction={ifood} hidden />);

    expect(screen.queryByText('- R$ 89,90')).toBeNull();
    expect(screen.getByLabelText('valor oculto')).toBeOnTheScreen();
  });

  it('com onPress vira um alvo "Editar" e dispara ao tocar', async () => {
    const onPress = jest.fn();
    await render(<TransactionRow transaction={ifood} hidden={false} onPress={onPress} />);

    await userEvent.setup().press(screen.getByRole('button', { name: `Editar ${ifood.title}` }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
