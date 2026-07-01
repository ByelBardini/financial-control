import { screen, userEvent } from '@testing-library/react-native';
import * as accountsApi from '../../src/api/accounts';
import * as dashApi from '../../src/api/dashboard';
import * as txApi from '../../src/api/transacoes';
import { ContasScreen } from '../../src/screens/ContasScreen';
import { useIsDesktop } from '../../src/hooks/useIsDesktop';
import { mockContasApi, mockPatrimonioApi, renderWithClient } from '../_support/renderWithClient';
import type { AccountDetail } from '../../src/types/accounts';

jest.mock('../../src/hooks/useIsDesktop');
jest.mock('../../src/api/contas');
jest.mock('../../src/api/patrimonio');
jest.mock('../../src/api/accounts');
jest.mock('../../src/api/dashboard');
jest.mock('../../src/api/transacoes');
const mockUseIsDesktop = useIsDesktop as jest.MockedFunction<typeof useIsDesktop>;

beforeEach(() => {
  jest.clearAllMocks();
  mockContasApi();
  mockPatrimonioApi();
  jest.mocked(dashApi.getAccounts).mockResolvedValue([
    {
      id: 'nubank-cartao',
      name: 'Nubank Roxinho',
      accountType: 'credit_card',
      balanceCents: -32000,
      icon: 'credit_card',
      tone: 'primary',
      dotColor: '#8a05be',
    },
  ]);
  jest.mocked(txApi.getCategories).mockResolvedValue([]);
});

describe('ContasScreen (responsivo)', () => {
  it('renderiza o layout mobile em telas estreitas', async () => {
    mockUseIsDesktop.mockReturnValue(false);
    await renderWithClient(<ContasScreen />);

    expect(await screen.findByText('Tempo Estimado de Vida (Bancária)')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Contas' })).toBeSelected(); // BottomNav
  });

  it('renderiza o layout desktop em telas largas', async () => {
    mockUseIsDesktop.mockReturnValue(true);
    await renderWithClient(<ContasScreen />);

    expect(await screen.findByText('Monitor de Sobrevivência')).toBeOnTheScreen();
    expect(await screen.findByText('Panic Meter™')).toBeOnTheScreen();
  });

  it('oculta e revela valores ao tocar no switch', async () => {
    mockUseIsDesktop.mockReturnValue(false);
    await renderWithClient(<ContasScreen />);
    await screen.findByText('Nubank'); // espera as queries assentarem

    await userEvent.setup().press(screen.getByRole('switch', { name: 'Ocultar valores' }));
    expect(screen.getAllByLabelText('valor oculto').length).toBeGreaterThan(0);
  });

  it('abre o modal de nova conta pelo speed dial (FAB)', async () => {
    mockUseIsDesktop.mockReturnValue(false);
    await renderWithClient(<ContasScreen />);
    await screen.findByText('Nubank');
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Ações da conta' })); // abre o FAB
    await user.press(screen.getByRole('button', { name: 'Nova conta' }));

    expect(await screen.findByRole('header', { name: 'Nova conta' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeOnTheScreen();
  });

  it('abre o detalhe do cartão ao tocar (não o form de editar)', async () => {
    mockUseIsDesktop.mockReturnValue(false);
    await renderWithClient(<ContasScreen />);

    await userEvent
      .setup()
      .press(await screen.findByRole('button', { name: 'Abrir Nubank Roxinho' }));

    expect(await screen.findByRole('header', { name: 'Detalhe do cartão' })).toBeOnTheScreen();
    expect(screen.queryByRole('header', { name: 'Editar conta' })).toBeNull();
  });

  it('a engrenagem do detalhe do cartão abre a edição', async () => {
    jest.mocked(accountsApi.getAccount).mockResolvedValue({
      id: 'nubank-cartao',
      name: 'Nubank Roxinho',
      accountType: 'credit_card',
      subtitle: '',
      balanceCents: -32000,
      icon: 'credit_card',
      tone: 'primary',
      dotColor: '#8a05be',
      creditLimitCents: 150000,
    } satisfies AccountDetail);
    mockUseIsDesktop.mockReturnValue(false);
    await renderWithClient(<ContasScreen />);
    const user = userEvent.setup();

    await user.press(await screen.findByRole('button', { name: 'Abrir Nubank Roxinho' }));
    await user.press(await screen.findByRole('button', { name: 'Editar cartão' }));

    expect(await screen.findByRole('header', { name: 'Editar conta' })).toBeOnTheScreen();
  });

  it('"Lançar na fatura" abre o modal dedicado (mês, não dia)', async () => {
    mockUseIsDesktop.mockReturnValue(false);
    await renderWithClient(<ContasScreen />);
    const user = userEvent.setup();

    await user.press(await screen.findByRole('button', { name: 'Abrir Nubank Roxinho' }));
    await user.press(await screen.findByRole('button', { name: 'Lançar na fatura' }));

    expect(await screen.findByRole('header', { name: 'Lançar na fatura' })).toBeOnTheScreen();
    expect(screen.getByLabelText(/Mês da fatura/)).toBeOnTheScreen();
  });

  it('"Transferir" pelo speed dial abre a transferência livre', async () => {
    mockUseIsDesktop.mockReturnValue(false);
    await renderWithClient(<ContasScreen />);
    await screen.findByText('Nubank');
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Ações da conta' })); // abre o FAB
    await user.press(screen.getByRole('button', { name: 'Transferir' }));

    expect(await screen.findByRole('header', { name: 'Transferir' })).toBeOnTheScreen();
  });

  it('tocar numa conta de banco abre Transferir (essa conta como origem)', async () => {
    mockUseIsDesktop.mockReturnValue(false);
    await renderWithClient(<ContasScreen />);

    await userEvent
      .setup()
      .press(await screen.findByRole('button', { name: 'Transferir de Nubank' }));

    expect(await screen.findByRole('header', { name: 'Transferir' })).toBeOnTheScreen();
  });

  it('a engrenagem da conta de banco abre a edição (pré-preenchido)', async () => {
    jest.mocked(accountsApi.getAccount).mockResolvedValue({
      id: 'nubank',
      name: 'Nubank',
      accountType: 'checking',
      subtitle: 'Conta Corrente • Final 4022',
      balanceCents: 84220,
      icon: 'account_balance',
      tone: 'neutral',
      dotColor: '#d0bcff',
      creditLimitCents: 0,
    } satisfies AccountDetail);
    mockUseIsDesktop.mockReturnValue(false);
    await renderWithClient(<ContasScreen />);

    await userEvent.setup().press(await screen.findByRole('button', { name: 'Editar Nubank' }));

    expect(await screen.findByRole('header', { name: 'Editar conta' })).toBeOnTheScreen();
    expect(await screen.findByDisplayValue('Nubank')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeOnTheScreen();
  });
});
