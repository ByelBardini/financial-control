import { screen } from '@testing-library/react-native';
import { MobileTransacoes } from '../../src/components/MobileTransacoes';
import { mockTransacoesApi, renderWithClient } from '../_support/renderWithClient';

jest.mock('../../src/api/transacoes');

beforeEach(() => {
  jest.clearAllMocks();
  mockTransacoesApi();
});

const noop = () => {};

describe('MobileTransacoes', () => {
  it('renderiza fluxo de caixa, colapso, transações, recorrências e dívidas', async () => {
    await renderWithClient(
      <MobileTransacoes hidden={false} onToggleHidden={noop} route="transacoes" />,
    );

    expect(await screen.findByText('Previsão de Colapso')).toBeOnTheScreen();
    expect(screen.getByText('8 Dias')).toBeOnTheScreen();
    expect(screen.getByText('iFood - "Só hoje"')).toBeOnTheScreen();
    expect(screen.getByText('Netflix 4K')).toBeOnTheScreen();
    expect(screen.getByText('iPhone 15 Pro')).toBeOnTheScreen();
  });

  it('destaca Transações no BottomNav', async () => {
    await renderWithClient(
      <MobileTransacoes hidden={false} onToggleHidden={noop} route="transacoes" />,
    );
    await screen.findByText('iFood - "Só hoje"');

    expect(screen.getByRole('button', { name: 'Transações' })).toBeSelected();
  });
});
