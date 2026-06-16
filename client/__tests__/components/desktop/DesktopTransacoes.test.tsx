import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { DesktopTransacoes } from '../../../src/components/desktop/DesktopTransacoes';
import { useTransactionFilters } from '../../../src/hooks/useTransactionFilters';
import * as api from '../../../src/api/transacoes';
import { mockTransacoesApi, renderWithClient } from '../../_support/renderWithClient';

jest.mock('../../../src/api/transacoes');

beforeEach(() => {
  jest.clearAllMocks();
  mockTransacoesApi();
});

// Harness com o controlador real (a tela é quem o possui) — exercita filtro→refetch.
function Harness() {
  const controls = useTransactionFilters();
  return (
    <DesktopTransacoes
      hidden={false}
      onToggleHidden={() => {}}
      controls={controls}
      route="transacoes"
    />
  );
}

describe('DesktopTransacoes', () => {
  it('renderiza header, fluxo, lista e painéis; destaca Transações no SideNav', async () => {
    await renderWithClient(<Harness />);

    expect(await screen.findByText('FLUXO DE CAIXA OPERACIONAL')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Transações' })).toBeOnTheScreen();
    expect(screen.getByText('iFood - "Só hoje"')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Recorrências' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Transações' })).toBeSelected();
  });

  it('escolher "3 Meses" no dropdown de período refaz a busca com period=3m', async () => {
    await renderWithClient(<Harness />);
    await screen.findByText('iFood - "Só hoje"');
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Período: 30 Dias' }));
    await user.press(screen.getByRole('menuitem', { name: '3 Meses' }));

    await waitFor(() =>
      expect(jest.mocked(api.getTransactionsPage)).toHaveBeenCalledWith(
        expect.objectContaining({ period: '3m' }),
        1,
        undefined, // pageSize: só medido em layout real (não dispara no jsdom)
      ),
    );
  });
});
