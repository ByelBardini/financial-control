import { screen, userEvent, waitFor } from '@testing-library/react-native';
import * as dashApi from '../../../src/api/dashboard';
import * as txApi from '../../../src/api/transacoes';
import { ApiError } from '../../../src/api/client';
import { TransactionFormModal } from '../../../src/components/transacoes/TransactionFormModal';
import { renderWithClient } from '../../_support/renderWithClient';
import type { Account } from '../../../src/types/dashboard';
import type { Category, TransactionDetail } from '../../../src/types/transacoes';

jest.mock('../../../src/api/dashboard');
jest.mock('../../../src/api/transacoes');

const accounts: Account[] = [
  {
    id: 'a1',
    name: 'Nubank',
    balanceCents: 100000,
    icon: 'account_balance',
    tone: 'neutral',
    dotColor: '#d0bcff',
  },
];
const categories: Category[] = [
  { id: 'ce', name: 'Mercado', icon: 'shopping_basket', kind: 'expense' },
  { id: 'ci', name: 'Salário', icon: 'payments', kind: 'income' },
];
const detail: TransactionDetail = {
  id: 't1',
  accountId: 'a1',
  categoryId: 'ce',
  description: 'Mercado da feira',
  direction: 'outflow',
  amountCents: 8900,
  occurredOn: '2026-06-10',
  accountLabel: 'Nubank',
  category: 'Mercado',
  icon: 'shopping_basket',
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(dashApi.getAccounts).mockResolvedValue(accounts);
  jest.mocked(txApi.getCategories).mockResolvedValue(categories);
});

describe('TransactionFormModal — criar', () => {
  it('título "Nova despesa" quando direction=outflow', async () => {
    await renderWithClient(
      <TransactionFormModal mode="create" direction="outflow" onClose={jest.fn()} />,
    );
    expect(await screen.findByRole('header', { name: 'Nova despesa' })).toBeOnTheScreen();
  });

  it('título "Nova receita" quando direction=inflow', async () => {
    await renderWithClient(
      <TransactionFormModal mode="create" direction="inflow" onClose={jest.fn()} />,
    );
    expect(await screen.findByRole('header', { name: 'Nova receita' })).toBeOnTheScreen();
  });

  it('cria (único, 1ª conta default) e fecha; sem descrição cai no rótulo do sentido', async () => {
    jest.mocked(txApi.createTransaction).mockResolvedValue({} as TransactionDetail);
    const onClose = jest.fn();
    await renderWithClient(
      <TransactionFormModal mode="create" direction="outflow" onClose={onClose} />,
    );
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('Valor'), '5000'); // sem digitar Descrição
    await user.press(screen.getByRole('button', { name: 'Adicionar transação' }));

    expect(txApi.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'a1',
        amountCents: 5000,
        direction: 'outflow',
        description: 'Despesa', // fallback do sentido
      }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('parcelado vai pro endpoint de parcelas', async () => {
    jest.mocked(txApi.createInstallmentPurchase).mockResolvedValue({ created: 2 });
    await renderWithClient(
      <TransactionFormModal mode="create" direction="outflow" onClose={jest.fn()} />,
    );
    const user = userEvent.setup();

    await user.press(await screen.findByRole('button', { name: 'Parcelado' }));
    await user.type(screen.getByLabelText('Valor da parcela'), '30000');
    await user.press(screen.getByRole('button', { name: 'Adicionar transação' }));

    expect(txApi.createInstallmentPurchase).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: 'a1', amountCents: 30000, totalInstallments: 2 }),
    );
  });

  it('fixo vai pro endpoint de recorrência', async () => {
    jest.mocked(txApi.createRecurringRule).mockResolvedValue({ created: true });
    await renderWithClient(
      <TransactionFormModal mode="create" direction="outflow" onClose={jest.fn()} />,
    );
    const user = userEvent.setup();

    await user.press(await screen.findByRole('button', { name: 'Fixo' }));
    await user.type(screen.getByLabelText('Valor'), '320000');
    await user.press(screen.getByRole('button', { name: 'Adicionar transação' }));

    expect(txApi.createRecurringRule).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: 'a1', amountCents: 320000, frequency: 'monthly' }),
    );
  });

  it('fecha ao tocar fora (backdrop)', async () => {
    const onClose = jest.fn();
    await renderWithClient(
      <TransactionFormModal mode="create" direction="outflow" onClose={onClose} />,
    );

    await userEvent.setup().press(await screen.findByLabelText('Fechar formulário'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('mostra o erro do server e não fecha', async () => {
    jest.mocked(txApi.createTransaction).mockRejectedValue(new ApiError('saldo insuficiente', 400));
    const onClose = jest.fn();
    await renderWithClient(
      <TransactionFormModal mode="create" direction="outflow" onClose={onClose} />,
    );
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('Valor'), '5000');
    await user.press(screen.getByRole('button', { name: 'Adicionar transação' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('saldo insuficiente');
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('TransactionFormModal — editar', () => {
  it('pré-preenche, salva e fecha', async () => {
    jest.mocked(txApi.getTransaction).mockResolvedValue(detail);
    jest.mocked(txApi.updateTransaction).mockResolvedValue(detail);
    const onClose = jest.fn();
    await renderWithClient(
      <TransactionFormModal mode="edit" transactionId="t1" onClose={onClose} />,
    );
    const user = userEvent.setup();

    expect(await screen.findByRole('header', { name: 'Editar transação' })).toBeOnTheScreen();
    expect(await screen.findByDisplayValue('Mercado da feira')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Salvar' }));

    expect(txApi.updateTransaction).toHaveBeenCalledWith(
      't1',
      expect.objectContaining({ description: 'Mercado da feira', amountCents: 8900 }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('exclui e fecha', async () => {
    jest.mocked(txApi.getTransaction).mockResolvedValue(detail);
    jest.mocked(txApi.deleteTransaction).mockResolvedValue(undefined);
    const onClose = jest.fn();
    await renderWithClient(
      <TransactionFormModal mode="edit" transactionId="t1" onClose={onClose} />,
    );
    const user = userEvent.setup();

    await screen.findByDisplayValue('Mercado da feira');
    await user.press(screen.getByRole('button', { name: 'Excluir transação' }));
    await user.press(screen.getByRole('button', { name: 'Confirmar exclusão' }));

    expect(txApi.deleteTransaction).toHaveBeenCalledWith('t1');
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
