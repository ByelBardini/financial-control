import { render, screen, userEvent } from '@testing-library/react-native';
import { TradeForm } from '../../../src/components/investimentos/TradeForm';
import { initialTradeValues } from '../../../src/lib/investmentTradeForm';

const accounts = [
  { id: 'a1', name: 'Nubank', icon: 'account_balance' as const, dotColor: '#d0bcff' },
  { id: 'a2', name: 'Binance', icon: 'currency_bitcoin' as const, dotColor: '#f3ba2f' },
];

// Preço já vem do ativo (pré-preenchido) → o caller injeta unitPriceCents no initial.
const stockInitial = { ...initialTradeValues('buy', '2026-06-19', 5000, false), accountId: 'a1' };
const cryptoInitial = { ...initialTradeValues('buy', '2026-06-19', 30000000, true), accountId: 'a1' };

describe('TradeForm — ação (não-cripto)', () => {
  it('abre em quantidade, sem toggle, e submete com o preço pré-preenchido do ativo', async () => {
    const onSubmit = jest.fn();
    await render(
      <TradeForm
        ticker="WEGE3"
        isCrypto={false}
        initial={stockInitial}
        accounts={accounts}
        onSubmit={onSubmit}
      />,
    );
    const user = userEvent.setup();

    expect(screen.queryByRole('button', { name: 'Por valor' })).toBeNull(); // sem toggle
    expect(screen.getByLabelText('Conta de origem: Nubank')).toBeOnTheScreen();

    await user.type(screen.getByLabelText('Quantidade'), '10'); // não digita preço (vem do ativo)
    await user.press(screen.getByRole('button', { name: 'Comprar WEGE3' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      side: 'buy',
      mode: 'quantity',
      quantity: '10',
      unitPriceCents: 5000, // pré-preenchido, fluiu sem digitar
      accountId: 'a1',
    });
  });

  it('mostra o total estimado conforme a quantidade', async () => {
    await render(
      <TradeForm
        ticker="WEGE3"
        isCrypto={false}
        initial={stockInitial}
        accounts={accounts}
        onSubmit={jest.fn()}
      />,
    );
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Quantidade'), '10'); // 10 × R$50,00 = R$500,00
    expect(screen.getByText(/Total estimado:/)).toBeOnTheScreen();
  });

  it('preço unitário 0 (ativo sem cotação) bloqueia o submit', async () => {
    const onSubmit = jest.fn();
    await render(
      <TradeForm
        ticker="WEGE3"
        isCrypto={false}
        initial={{ ...initialTradeValues('buy', '2026-06-19', 0, false), accountId: 'a1' }}
        accounts={accounts}
        onSubmit={onSubmit}
      />,
    );
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Quantidade'), '10'); // não digita preço (vem 0 do ativo)
    await user.press(screen.getByRole('button', { name: 'Comprar WEGE3' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
  });
});

describe('TradeForm — cripto', () => {
  it('abre em "Por valor", deriva a quantidade e submete no modo valor', async () => {
    const onSubmit = jest.fn();
    await render(
      <TradeForm
        ticker="BTC"
        isCrypto={true}
        initial={cryptoInitial}
        accounts={accounts}
        onSubmit={onSubmit}
      />,
    );
    const user = userEvent.setup();

    expect(screen.getByRole('button', { name: 'Por valor' })).toBeOnTheScreen();
    await user.type(screen.getByLabelText('Valor a investir'), '10000'); // R$100,00
    expect(screen.getByText('≈ 0.00033333 BTC')).toBeOnTheScreen(); // 100 / 300.000

    await user.press(screen.getByRole('button', { name: 'Comprar BTC' }));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      mode: 'value',
      amountCents: 10000,
      unitPriceCents: 30000000,
    });
  });

  it('alterna entre "Por valor" e "Por quantidade"', async () => {
    await render(
      <TradeForm
        ticker="BTC"
        isCrypto={true}
        initial={cryptoInitial}
        accounts={accounts}
        onSubmit={jest.fn()}
      />,
    );
    const user = userEvent.setup();

    expect(screen.getByLabelText('Valor a investir')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Quantidade')).toBeNull();

    await user.press(screen.getByRole('button', { name: 'Por quantidade' }));
    expect(screen.getByLabelText('Quantidade')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Valor a investir')).toBeNull();
  });

  it('na venda, o campo de valor vira "Valor a resgatar"', async () => {
    await render(
      <TradeForm
        ticker="BTC"
        isCrypto={true}
        initial={{ ...initialTradeValues('sell', '2026-06-19', 30000000, true), accountId: 'a1' }}
        accounts={accounts}
        onSubmit={jest.fn()}
      />,
    );

    expect(screen.getByLabelText('Valor a resgatar')).toBeOnTheScreen();
    expect(screen.getByLabelText('Conta de destino: Nubank')).toBeOnTheScreen();
  });

  it('venda no modo valor deriva a quantidade do "Valor a resgatar" e submete side=sell', async () => {
    const onSubmit = jest.fn();
    await render(
      <TradeForm
        ticker="BTC"
        isCrypto={true}
        initial={{ ...initialTradeValues('sell', '2026-06-19', 30000000, true), accountId: 'a1' }}
        accounts={accounts}
        onSubmit={onSubmit}
      />,
    );
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Valor a resgatar'), '15000000'); // R$150.000 ÷ 300.000 = 0,5 BTC
    expect(screen.getByText('≈ 0.5 BTC')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Vender BTC' }));

    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      side: 'sell',
      mode: 'value',
      amountCents: 15000000,
      unitPriceCents: 30000000,
    });
  });
});
