import { render, screen, userEvent } from '@testing-library/react-native';
import { CryptoCard } from '../../../src/components/investimentos/CryptoCard';
import { investimentosSnapshot } from '../../../src/mocks/investimentosSnapshot';
import { formatBRL } from '../../../src/lib/money';
import { formatPercent } from '../../../src/lib/percent';

const holding = investimentosSnapshot.crypto.holdings[0]!; // BTC

describe('CryptoCard', () => {
  it('mostra símbolo, nome, valor atual e resultado (R$ e %)', async () => {
    await render(<CryptoCard holding={holding} hidden={false} />);

    expect(screen.getByText('BTC')).toBeOnTheScreen();
    expect(screen.getByText('Bitcoin')).toBeOnTheScreen();
    expect(screen.getByText(formatBRL(holding.currentValueCents))).toBeOnTheScreen();
    expect(screen.getByText(formatBRL(holding.gainCents))).toBeOnTheScreen();
    expect(screen.getByText(formatPercent(holding.gainPct))).toBeOnTheScreen();
    expect(screen.getByTestId('crypto-chart')).toBeOnTheScreen();
  });

  it('mascara os valores quando hidden', async () => {
    await render(<CryptoCard holding={holding} hidden={true} />);

    expect(screen.getAllByLabelText('valor oculto').length).toBeGreaterThan(0);
    expect(screen.queryByText(formatBRL(holding.currentValueCents))).toBeNull();
  });

  it('com onPress vira alvo de toque "Abrir <símbolo>"', async () => {
    const onPress = jest.fn();
    await render(<CryptoCard holding={holding} hidden={false} onPress={onPress} />);

    await userEvent.setup().press(screen.getByRole('button', { name: 'Abrir BTC' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
