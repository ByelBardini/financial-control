import { render, screen, userEvent } from '@testing-library/react-native';
import { PositionRow } from '../../../src/components/investimentos/PositionRow';
import { investimentosSnapshot } from '../../../src/mocks/investimentosSnapshot';
import { formatBRL } from '../../../src/lib/money';
import { formatPercent } from '../../../src/lib/percent';

const position = investimentosSnapshot.positions[0]!; // PETR4

describe('PositionRow', () => {
  it('mostra ativo, investido, valor atual e ganho/perda em R$ e %', async () => {
    await render(<PositionRow position={position} hidden={false} />);

    expect(screen.getByText('PETR4')).toBeOnTheScreen();
    expect(screen.getByText('Petrobras PN')).toBeOnTheScreen();
    expect(screen.getByText(formatBRL(position.costBasisCents))).toBeOnTheScreen();
    expect(screen.getByText(formatBRL(position.currentValueCents))).toBeOnTheScreen();
    expect(screen.getByText(formatBRL(position.gainCents))).toBeOnTheScreen();
    expect(screen.getByText(formatPercent(position.gainPct))).toBeOnTheScreen();
  });

  it('na variante de tabela (desktop) mostra os mesmos valores', async () => {
    await render(<PositionRow position={position} hidden={false} variant="row" />);

    expect(screen.getByText('PETR4')).toBeOnTheScreen();
    expect(screen.getByText(formatBRL(position.currentValueCents))).toBeOnTheScreen();
    expect(screen.getByText(formatPercent(position.gainPct))).toBeOnTheScreen();
  });

  it('mascara os valores quando hidden', async () => {
    await render(<PositionRow position={position} hidden={true} />);

    expect(screen.getAllByLabelText('valor oculto').length).toBeGreaterThan(0);
    expect(screen.queryByText(formatBRL(position.currentValueCents))).toBeNull();
  });

  it('com onPress vira alvo de toque "Abrir <ticker>"', async () => {
    const onPress = jest.fn();
    await render(<PositionRow position={position} hidden={false} onPress={onPress} />);

    await userEvent.setup().press(screen.getByRole('button', { name: 'Abrir PETR4' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('sem onPress não é um botão', async () => {
    await render(<PositionRow position={position} hidden={false} />);
    expect(screen.queryByRole('button', { name: 'Abrir PETR4' })).toBeNull();
  });
});
