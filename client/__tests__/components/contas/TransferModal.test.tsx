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
    balanceCents: 100000,
    icon: 'account_balance',
    tone: 'neutral',
    dotColor: '#d0bcff',
  },
  {
    id: 'card1',
    name: 'Nubank Cartão',
    balanceCents: -32000,
    icon: 'credit_card',
    tone: 'primary',
    dotColor: '#8a05be',
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
    expect(screen.getByRole('button', { name: 'Para: Nubank Cartão' })).toBeDisabled();

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
});

describe('TransferModal — transferência livre', () => {
  it('deixa os dois pickers livres e transfere entre as contas', async () => {
    jest.mocked(transfersApi.createTransfer).mockResolvedValue({} as never);
    await renderWithClient(<TransferModal onClose={jest.fn()} />);
    const user = userEvent.setup();

    expect(await screen.findByRole('header', { name: 'Transferir' })).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'De: Conta de origem' }));
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
