import { render, screen } from '@testing-library/react-native';
import { PortfolioHero } from '../../../src/components/investimentos/PortfolioHero';
import { investimentosSnapshot } from '../../../src/mocks/investimentosSnapshot';
import { formatBRL } from '../../../src/lib/money';
import { formatPercent } from '../../../src/lib/percent';

const summary = investimentosSnapshot.summary;

describe('PortfolioHero', () => {
  it('mostra o título, o patrimônio total e o ganho/perda em R$ e %', async () => {
    await render(<PortfolioHero summary={summary} hidden={false} />);

    expect(screen.getByRole('header', { name: 'Portfólio de Ilusões' })).toBeOnTheScreen();
    expect(screen.getByText(formatBRL(summary.totalCents))).toBeOnTheScreen();
    expect(screen.getByText(formatBRL(summary.gainCents))).toBeOnTheScreen();
    expect(screen.getByText(`(${formatPercent(summary.gainPct)})`)).toBeOnTheScreen();
  });

  it('mascara os valores quando hidden', async () => {
    await render(<PortfolioHero summary={summary} hidden={true} />);

    expect(screen.getAllByLabelText('valor oculto').length).toBeGreaterThan(0);
    expect(screen.queryByText(formatBRL(summary.totalCents))).toBeNull();
  });
});
