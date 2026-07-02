import { screen, userEvent, waitFor } from '@testing-library/react-native';
import * as api from '../../../src/api/accounts';
import * as dashApi from '../../../src/api/dashboard';
import { ApiError } from '../../../src/api/client';
import { AccountFormModal } from '../../../src/components/contas/AccountFormModal';
import { renderWithClient } from '../../_support/renderWithClient';
import type { Account } from '../../../src/types/dashboard';
import type { AccountDetail } from '../../../src/types/accounts';

jest.mock('../../../src/api/accounts');
jest.mock('../../../src/api/dashboard');

const bankAccounts: Account[] = [
  {
    id: 'b1',
    name: 'Nubank',
    accountType: 'checking',
    balanceCents: 100000,
    icon: 'account_balance',
    tone: 'primary',
    dotColor: '#d0bcff',
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(dashApi.getAccounts).mockResolvedValue(bankAccounts);
});

const cardDetail: AccountDetail = {
  id: 'c1',
  name: 'Nubank Cartão',
  accountType: 'credit_card',
  subtitle: 'Final 4022',
  balanceCents: -420000,
  icon: 'credit_card',
  tone: 'primary',
  dotColor: '#8a05be',
  creditLimitCents: 500000,
  paymentAccountId: 'b1',
};

describe('AccountFormModal — criar', () => {
  it('cria a conta e fecha', async () => {
    jest.mocked(api.createAccount).mockResolvedValue({ id: 'a1' } as AccountDetail);
    const onClose = jest.fn();
    await renderWithClient(<AccountFormModal mode="create" onClose={onClose} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Nome'), 'Nubank');
    await user.type(screen.getByLabelText('Saldo inicial'), '50000');
    await user.press(screen.getByRole('button', { name: 'Criar conta' }));

    expect(api.createAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Nubank',
        accountType: 'checking',
        openingBalanceCents: 50000,
      }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('esconde o saldo inicial ao escolher Cartão (cartão é só fatura)', async () => {
    const onClose = jest.fn();
    await renderWithClient(<AccountFormModal mode="create" onClose={onClose} />);
    const user = userEvent.setup();

    expect(screen.getByLabelText('Saldo inicial')).toBeOnTheScreen(); // checking mostra
    await user.press(screen.getByRole('button', { name: 'Cartão' }));

    expect(screen.queryByLabelText('Saldo inicial')).toBeNull(); // cartão esconde
    expect(screen.getByLabelText('Limite de crédito')).toBeOnTheScreen();
  });

  it('fecha ao tocar fora do formulário (backdrop)', async () => {
    const onClose = jest.fn();
    await renderWithClient(<AccountFormModal mode="create" onClose={onClose} />);
    const user = userEvent.setup();

    await user.press(screen.getByLabelText('Fechar formulário'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('mostra a mensagem do server e não fecha quando a mutation falha', async () => {
    jest.mocked(api.createAccount).mockRejectedValue(new ApiError('nome já existe', 400));
    const onClose = jest.fn();
    await renderWithClient(<AccountFormModal mode="create" onClose={onClose} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Nome'), 'Nubank');
    await user.type(screen.getByLabelText('Saldo inicial'), '50000');
    await user.press(screen.getByRole('button', { name: 'Criar conta' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('nome já existe');
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('AccountFormModal — editar', () => {
  it('pré-preenche (sem saldo), salva e fecha', async () => {
    jest.mocked(api.getAccount).mockResolvedValue(cardDetail);
    jest.mocked(api.updateAccount).mockResolvedValue(cardDetail);
    const onClose = jest.fn();
    await renderWithClient(<AccountFormModal mode="edit" accountId="c1" onClose={onClose} />);
    const user = userEvent.setup();

    expect(await screen.findByDisplayValue('Nubank Cartão')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Saldo inicial')).toBeNull();

    await user.press(screen.getByRole('button', { name: 'Salvar' }));

    expect(api.updateAccount).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ name: 'Nubank Cartão' }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('arquiva e fecha', async () => {
    jest.mocked(api.getAccount).mockResolvedValue(cardDetail);
    jest.mocked(api.archiveAccount).mockResolvedValue(undefined);
    const onClose = jest.fn();
    await renderWithClient(<AccountFormModal mode="edit" accountId="c1" onClose={onClose} />);
    const user = userEvent.setup();

    await screen.findByDisplayValue('Nubank Cartão');
    await user.press(screen.getByRole('button', { name: 'Arquivar conta' }));
    await user.press(screen.getByRole('button', { name: 'Confirmar arquivamento' }));

    expect(api.archiveAccount).toHaveBeenCalledWith('c1');
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
