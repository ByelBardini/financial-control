import { render, screen, userEvent } from '@testing-library/react-native';
import { TradeForm } from '../../../src/components/investimentos/TradeForm';
import { initialTradeValues } from '../../../src/lib/investmentTradeForm';

const accounts = [
  { id: 'a1', name: 'Nubank', icon: 'account_balance' as const, dotColor: '#d0bcff' },
  { id: 'a2', name: 'Binance', icon: 'currency_bitcoin' as const, dotColor: '#f3ba2f' },
];

describe('TradeForm — comprar', () => {
  it('valida e bloqueia o submit quando vazio', async () => {
    const onSubmit = jest.fn();
    await render(
      <TradeForm
        ticker="WEGE3"
        initial={initialTradeValues('buy', '2026-06-19')}
        accounts={accounts}
        onSubmit={onSubmit}
      />,
    );
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Comprar WEGE3' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
  });

  it('usa "Conta de origem" e submete os valores quando válido', async () => {
    const onSubmit = jest.fn();
    await render(
      <TradeForm
        ticker="WEGE3"
        initial={{ ...initialTradeValues('buy', '2026-06-19'), accountId: 'a1' }}
        accounts={accounts}
        onSubmit={onSubmit}
      />,
    );
    const user = userEvent.setup();

    expect(screen.getByLabelText('Conta de origem: Nubank')).toBeOnTheScreen();
    await user.type(screen.getByLabelText('Quantidade'), '10');
    await user.type(screen.getByLabelText('Preço unitário'), '1000');
    await user.press(screen.getByRole('button', { name: 'Comprar WEGE3' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      side: 'buy',
      quantity: '10',
      unitPriceCents: 1000,
      accountId: 'a1',
      tradedOn: '2026-06-19',
    });
  });
});

describe('TradeForm — vender', () => {
  it('usa "Conta de destino" e o botão "Vender <ticker>"', async () => {
    await render(
      <TradeForm
        ticker="BTC"
        initial={initialTradeValues('sell', '2026-06-19')}
        accounts={accounts}
        onSubmit={jest.fn()}
      />,
    );

    expect(screen.getByLabelText('Conta de destino: Escolha uma conta')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Vender BTC' })).toBeOnTheScreen();
  });

  it('escolhe a conta pelo select e a inclui no submit', async () => {
    const onSubmit = jest.fn();
    await render(
      <TradeForm
        ticker="BTC"
        initial={initialTradeValues('sell', '2026-06-19')}
        accounts={accounts}
        onSubmit={onSubmit}
      />,
    );
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Quantidade'), '0.5');
    await user.type(screen.getByLabelText('Preço unitário'), '15000000');
    await user.press(screen.getByLabelText('Conta de destino: Escolha uma conta'));
    await user.press(screen.getByRole('menuitem', { name: 'Binance' }));
    await user.press(screen.getByRole('button', { name: 'Vender BTC' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      side: 'sell',
      quantity: '0.5',
      accountId: 'a2',
    });
  });
});
