import { render, screen } from '@testing-library/react-native';
import { CryptoSection } from '../../../src/components/investimentos/CryptoSection';
import { investimentosSnapshot } from '../../../src/mocks/investimentosSnapshot';
import { formatBRL } from '../../../src/lib/money';

const crypto = investimentosSnapshot.crypto;

describe('CryptoSection', () => {
  it('mostra o bloco à parte com título, subtítulo, subtotal próprio e cada holding', async () => {
    await render(<CryptoSection crypto={crypto} hidden={false} />);

    expect(screen.getByRole('header', { name: 'O Circo da Volatilidade' })).toBeOnTheScreen();
    expect(screen.getByText('2 ativos no picadeiro')).toBeOnTheScreen();
    expect(screen.getByText(formatBRL(crypto.subtotalCents))).toBeOnTheScreen();
    expect(screen.getByText('BTC')).toBeOnTheScreen();
    expect(screen.getByText('ETH')).toBeOnTheScreen();
  });

  it('mascara os valores quando hidden', async () => {
    await render(<CryptoSection crypto={crypto} hidden={true} />);

    expect(screen.queryByText(formatBRL(crypto.subtotalCents))).toBeNull();
    expect(screen.getAllByLabelText('valor oculto').length).toBeGreaterThan(0);
  });
});
