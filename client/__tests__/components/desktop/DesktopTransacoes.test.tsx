import { screen } from '@testing-library/react-native';
import { DesktopTransacoes } from '../../../src/components/desktop/DesktopTransacoes';
import { mockTransacoesApi, renderWithClient } from '../../_support/renderWithClient';

jest.mock('../../../src/api/transacoes');

beforeEach(() => {
  jest.clearAllMocks();
  mockTransacoesApi();
});

const noop = () => {};

describe('DesktopTransacoes', () => {
  it('renderiza header, fluxo de caixa, lista e os painéis laterais', async () => {
    await renderWithClient(
      <DesktopTransacoes hidden={false} onToggleHidden={noop} route="transacoes" />,
    );

    expect(await screen.findByText('FLUXO DE CAIXA OPERACIONAL')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Transações' })).toBeOnTheScreen();
    expect(screen.getByText('iFood - "Só hoje"')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Recorrências' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Dívidas Futuras' })).toBeOnTheScreen();
  });

  it('destaca Transações no SideNav', async () => {
    await renderWithClient(
      <DesktopTransacoes hidden={false} onToggleHidden={noop} route="transacoes" />,
    );
    await screen.findByText('FLUXO DE CAIXA OPERACIONAL');

    expect(screen.getByRole('button', { name: 'Transações' })).toBeSelected();
  });
});
