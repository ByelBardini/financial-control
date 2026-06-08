import { screen, userEvent } from '@testing-library/react-native';
import * as accountsApi from '../../src/api/accounts';
import { ContasScreen } from '../../src/screens/ContasScreen';
import { useIsDesktop } from '../../src/hooks/useIsDesktop';
import { mockContasApi, renderWithClient } from '../_support/renderWithClient';
import type { AccountDetail } from '../../src/types/accounts';

jest.mock('../../src/hooks/useIsDesktop');
jest.mock('../../src/api/contas');
jest.mock('../../src/api/accounts');
const mockUseIsDesktop = useIsDesktop as jest.MockedFunction<typeof useIsDesktop>;

beforeEach(() => {
  jest.clearAllMocks();
  mockContasApi();
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

  it('abre o modal de nova conta pelo FAB', async () => {
    mockUseIsDesktop.mockReturnValue(false);
    await renderWithClient(<ContasScreen />);
    await screen.findByText('Nubank');

    await userEvent.setup().press(screen.getByRole('button', { name: 'Nova conta' }));

    expect(await screen.findByRole('header', { name: 'Nova conta' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeOnTheScreen();
  });

  it('abre o modal de edição ao tocar numa conta de banco (pré-preenchido)', async () => {
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
