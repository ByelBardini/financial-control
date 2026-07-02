import { screen, userEvent, waitFor } from '@testing-library/react-native';
import * as dashApi from '../../../src/api/dashboard';
import * as transfersApi from '../../../src/api/transfers';
import { TransferModal } from '../../../src/components/contas/TransferModal';
import { renderWithClient } from '../../_support/renderWithClient';
import type { Account } from '../../../src/types/dashboard';

jest.mock('../../../src/api/dashboard');
jest.mock('../../../src/api/transfers');

const accounts: Account[] = [
  {
    id: 'a1',
    name: 'Nubank',
    accountType: 'checking',
    balanceCents: 100000,
    icon: 'account_balance',
    tone: 'neutral',
    dotColor: '#d0bcff',
  },
  {
    id: 'card1',
    name: 'Nubank Cartão',
    accountType: 'credit_card',
    balanceCents: -32000,
    icon: 'credit_card',
    tone: 'primary',
    dotColor: '#8a05be',
  },
  {
    id: 'vale1',
    name: 'Alelo',
    accountType: 'voucher',
    balanceCents: 21500,
    icon: 'restaurant',
    tone: 'secondary',
    dotColor: '#9ddf2e',
  },
  {
    id: 'vale2',
    name: 'Sodexo',
    accountType: 'voucher',
    balanceCents: 8000,
    icon: 'restaurant',
    tone: 'secondary',
    dotColor: '#9ddf2e',
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(dashApi.getAccounts).mockResolvedValue(accounts);
});

describe('TransferModal — pagar fatura', () => {
  it('trava o destino no cartão, sugere a fatura como valor e transfere', async () => {
    jest.mocked(transfersApi.createTransfer).mockResolvedValue({} as never);
    const onClose = jest.fn();
    await renderWithClient(
      <TransferModal lockedDestinationId="card1" defaultAmountCents={32000} onClose={onClose} />,
    );
    const user = userEvent.setup();

    expect(await screen.findByRole('header', { name: 'Pagar fatura' })).toBeOnTheScreen();
    expect(await screen.findByRole('button', { name: 'Para: Nubank Cartão' })).toBeDisabled();

    // escolhe a origem (de onde sai o dinheiro)
    await user.press(screen.getByRole('button', { name: 'De: Conta de origem' }));
    await user.press(screen.getByRole('menuitem', { name: 'Nubank' }));

    await user.press(screen.getByRole('button', { name: 'Transferir' }));

    expect(transfersApi.createTransfer).toHaveBeenCalledWith(
      expect.objectContaining({
        originAccountId: 'a1',
        destinationAccountId: 'card1',
        amountCents: 32000,
      }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('trava a origem na conta vinculada (sem escolha) quando lockedOriginId é dado', async () => {
    jest.mocked(transfersApi.createTransfer).mockResolvedValue({} as never);
    const onClose = jest.fn();
    await renderWithClient(
      <TransferModal
        lockedDestinationId="card1"
        lockedOriginId="a1"
        defaultAmountCents={32000}
        onClose={onClose}
      />,
    );
    const user = userEvent.setup();

    // Origem e destino travados na conta vinculada (Nubank) e no cartão — sem trocar nem escolher.
    expect(await screen.findByRole('button', { name: 'De: Nubank' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Para: Nubank Cartão' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Trocar origem e destino' })).toBeNull();

    await user.press(screen.getByRole('button', { name: 'Transferir' }));

    expect(transfersApi.createTransfer).toHaveBeenCalledWith(
      expect.objectContaining({
        originAccountId: 'a1',
        destinationAccountId: 'card1',
        amountCents: 32000,
      }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});

describe('TransferModal — transferência livre', () => {
  it('deixa os dois pickers livres e transfere entre as contas', async () => {
    jest.mocked(transfersApi.createTransfer).mockResolvedValue({} as never);
    await renderWithClient(<TransferModal onClose={jest.fn()} />);
    const user = userEvent.setup();

    expect(await screen.findByRole('header', { name: 'Transferir' })).toBeOnTheScreen();

    await user.press(await screen.findByRole('button', { name: 'De: Conta de origem' }));
    await user.press(screen.getByRole('menuitem', { name: 'Nubank' }));
    await user.press(screen.getByRole('button', { name: 'Para: Conta de destino' }));
    await user.press(screen.getByRole('menuitem', { name: 'Nubank Cartão' }));
    await user.type(screen.getByLabelText('Valor'), '5000');
    await user.press(screen.getByRole('button', { name: 'Transferir' }));

    expect(transfersApi.createTransfer).toHaveBeenCalledWith(
      expect.objectContaining({
        originAccountId: 'a1',
        destinationAccountId: 'card1',
        amountCents: 5000,
      }),
    );
  });

  it('vale só transfere para vale — o destino filtra por classe', async () => {
    jest.mocked(transfersApi.createTransfer).mockResolvedValue({} as never);
    await renderWithClient(<TransferModal onClose={jest.fn()} />);
    const user = userEvent.setup();

    // Origem = vale Alelo → o destino só oferece vales (Sodexo), não bancos/cartão.
    await user.press(await screen.findByRole('button', { name: 'De: Conta de origem' }));
    await user.press(screen.getByRole('menuitem', { name: 'Alelo' }));
    await user.press(screen.getByRole('button', { name: 'Para: Conta de destino' }));
    expect(screen.getByRole('menuitem', { name: 'Sodexo' })).toBeOnTheScreen();
    expect(screen.queryByRole('menuitem', { name: 'Nubank' })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: 'Nubank Cartão' })).toBeNull();

    await user.press(screen.getByRole('menuitem', { name: 'Sodexo' }));
    await user.type(screen.getByLabelText('Valor'), '3000');
    await user.press(screen.getByRole('button', { name: 'Transferir' }));

    expect(transfersApi.createTransfer).toHaveBeenCalledWith(
      expect.objectContaining({
        originAccountId: 'vale1',
        destinationAccountId: 'vale2',
        amountCents: 3000,
      }),
    );
  });

  it('a troca ⇅ inverte origem e destino', async () => {
    jest.mocked(transfersApi.createTransfer).mockResolvedValue({} as never);
    await renderWithClient(<TransferModal onClose={jest.fn()} />);
    const user = userEvent.setup();

    await user.press(await screen.findByRole('button', { name: 'De: Conta de origem' }));
    await user.press(screen.getByRole('menuitem', { name: 'Nubank' }));
    await user.press(screen.getByRole('button', { name: 'Para: Conta de destino' }));
    await user.press(screen.getByRole('menuitem', { name: 'Nubank Cartão' }));

    await user.press(screen.getByRole('button', { name: 'Trocar origem e destino' }));
    await user.type(screen.getByLabelText('Valor'), '5000');
    await user.press(screen.getByRole('button', { name: 'Transferir' }));

    expect(transfersApi.createTransfer).toHaveBeenCalledWith(
      expect.objectContaining({
        originAccountId: 'card1',
        destinationAccountId: 'a1',
        amountCents: 5000,
      }),
    );
  });
});
