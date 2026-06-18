import { screen, userEvent } from '@testing-library/react-native';
import { TransacoesScreen } from '../../src/screens/TransacoesScreen';
import { useIsDesktop } from '../../src/hooks/useIsDesktop';
import * as txApi from '../../src/api/transacoes';
import { transacoesSnapshot } from '../../src/mocks/transacoesSnapshot';
import {
  mockDashboardApi,
  mockTransacoesApi,
  renderWithClient,
} from '../_support/renderWithClient';
import type { TransactionDetail } from '../../src/types/transacoes';

jest.mock('../../src/hooks/useIsDesktop');
jest.mock('../../src/api/transacoes');
jest.mock('../../src/api/dashboard');
const mockUseIsDesktop = useIsDesktop as jest.MockedFunction<typeof useIsDesktop>;

const [ifood] = transacoesSnapshot.transactions;
const ifoodDetail: TransactionDetail = {
  id: ifood.id,
  accountId: 'a1',
  categoryId: '',
  description: 'iFood',
  direction: 'outflow',
  amountCents: 8990,
  occurredOn: '2026-06-10',
  accountLabel: 'Nubank',
  category: 'Alimentação',
  icon: 'restaurant',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockTransacoesApi();
  mockDashboardApi();
});

describe('TransacoesScreen (responsivo)', () => {
  it('renderiza o layout mobile em telas estreitas', async () => {
    mockUseIsDesktop.mockReturnValue(false);
    await renderWithClient(<TransacoesScreen />);

    expect(await screen.findByText('Previsão de Colapso')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Transações' })).toBeSelected(); // BottomNav
  });

  it('renderiza o layout desktop em telas largas', async () => {
    mockUseIsDesktop.mockReturnValue(true);
    await renderWithClient(<TransacoesScreen />);

    expect(await screen.findByText('FLUXO DE CAIXA OPERACIONAL')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Transações' })).toBeOnTheScreen();
  });

  it('oculta e revela valores ao tocar no switch', async () => {
    mockUseIsDesktop.mockReturnValue(false);
    await renderWithClient(<TransacoesScreen />);
    await screen.findByText('iFood - "Só hoje"'); // espera as queries assentarem

    await userEvent.setup().press(screen.getByRole('switch', { name: 'Ocultar valores' }));
    expect(screen.getAllByLabelText('valor oculto').length).toBeGreaterThan(0);
  });
});

describe('TransacoesScreen — abrir o lançamento (modal)', () => {
  it('desktop: header → mini menu → Receita abre o modal "Nova receita"', async () => {
    mockUseIsDesktop.mockReturnValue(true);
    await renderWithClient(<TransacoesScreen />);
    await screen.findByText('FLUXO DE CAIXA OPERACIONAL');
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Nova transação' }));
    await user.press(screen.getByRole('button', { name: 'Receita' }));

    expect(await screen.findByRole('header', { name: 'Nova receita' })).toBeOnTheScreen();
  });

  it('desktop: tocar numa transação abre o modal "Editar transação" pré-preenchido', async () => {
    mockUseIsDesktop.mockReturnValue(true);
    jest.mocked(txApi.getTransaction).mockResolvedValue(ifoodDetail);
    await renderWithClient(<TransacoesScreen />);
    await screen.findByText(ifood.title);
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: `Editar ${ifood.title}` }));

    expect(await screen.findByRole('header', { name: 'Editar transação' })).toBeOnTheScreen();
    expect(await screen.findByDisplayValue('iFood')).toBeOnTheScreen();
  });

  it('mobile: FAB → speed dial → Despesa abre o modal "Nova despesa"', async () => {
    mockUseIsDesktop.mockReturnValue(false);
    await renderWithClient(<TransacoesScreen />);
    await screen.findByText('Previsão de Colapso');
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Nova transação' }));
    await user.press(screen.getByRole('button', { name: 'Despesa' }));

    expect(await screen.findByRole('header', { name: 'Nova despesa' })).toBeOnTheScreen();
  });
});
