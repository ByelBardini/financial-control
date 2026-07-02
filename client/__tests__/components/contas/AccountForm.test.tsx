import { render, screen, userEvent } from '@testing-library/react-native';
import { AccountForm } from '../../../src/components/contas/AccountForm';
import type { SelectOption } from '../../../src/components/SelectField';
import { initialValues } from '../../../src/lib/accountForm';

const bankOptions: SelectOption[] = [
  { value: 'b1', label: 'Nubank', icon: 'account_balance', dotColor: '#d0bcff' },
];

describe('AccountForm', () => {
  it('cria: valida o nome e envia os valores convertidos', async () => {
    const onSubmit = jest.fn();
    await render(
      <AccountForm
        mode="create"
        initial={initialValues('checking')}
        paymentAccountOptions={bankOptions}
        onSubmit={onSubmit}
      />,
    );
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Criar conta' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeOnTheScreen();

    await user.type(screen.getByLabelText('Nome'), 'Nubank');
    await user.type(screen.getByLabelText('Saldo inicial'), '50000');
    await user.press(screen.getByRole('button', { name: 'Criar conta' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      name: 'Nubank',
      accountType: 'checking',
      openingBalanceCents: 50000,
    });
  });

  it('cartão mostra o limite e exige valor > 0', async () => {
    const onSubmit = jest.fn();
    await render(
      <AccountForm
        mode="create"
        initial={initialValues('checking')}
        paymentAccountOptions={bankOptions}
        onSubmit={onSubmit}
      />,
    );
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Cartão' }));
    expect(screen.getByLabelText('Limite de crédito')).toBeOnTheScreen();

    await user.type(screen.getByLabelText('Nome'), 'Nubank Cartão');
    await user.press(screen.getByRole('button', { name: 'Criar conta' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/limite maior que zero/i)).toBeOnTheScreen();
  });

  it('cartão exige a conta de pagamento e a envia ao submeter', async () => {
    const onSubmit = jest.fn();
    await render(
      <AccountForm
        mode="create"
        initial={initialValues('checking')}
        paymentAccountOptions={bankOptions}
        onSubmit={onSubmit}
      />,
    );
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Cartão' }));
    await user.type(screen.getByLabelText('Nome'), 'Nubank Cartão');
    await user.type(screen.getByLabelText('Limite de crédito'), '500000');
    await user.press(screen.getByRole('button', { name: 'Criar conta' }));

    // Sem conta de pagamento escolhida → não submete e mostra o erro específico.
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/conta de banco que paga a fatura/i)).toBeOnTheScreen();

    // Escolhe a conta de pagamento no seletor e submete.
    await user.press(screen.getByLabelText(/Conta de pagamento:/));
    await user.press(screen.getByRole('menuitem', { name: 'Nubank' }));
    await user.press(screen.getByRole('button', { name: 'Criar conta' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      accountType: 'credit_card',
      creditLimitCents: 500000,
      paymentAccountId: 'b1',
    });
  });

  it('cartão sem contas de banco mostra aviso em vez do seletor', async () => {
    await render(
      <AccountForm
        mode="create"
        initial={{ ...initialValues('credit_card'), name: 'Cartão', creditLimitCents: 500000 }}
        paymentAccountOptions={[]}
        onSubmit={jest.fn()}
      />,
    );

    expect(screen.getByText(/Cadastre uma conta de banco primeiro/i)).toBeOnTheScreen();
    expect(screen.queryByLabelText(/Conta de pagamento:/)).toBeNull();
  });

  it('edita: sem campo de saldo e com arquivar (confirmação)', async () => {
    const onArchive = jest.fn();
    await render(
      <AccountForm
        mode="edit"
        initial={{ ...initialValues('checking'), name: 'Nubank' }}
        paymentAccountOptions={bankOptions}
        onSubmit={jest.fn()}
        onArchive={onArchive}
      />,
    );
    const user = userEvent.setup();

    expect(screen.queryByLabelText('Saldo inicial')).toBeNull();

    await user.press(screen.getByRole('button', { name: 'Arquivar conta' }));
    await user.press(screen.getByRole('button', { name: 'Confirmar arquivamento' }));

    expect(onArchive).toHaveBeenCalledTimes(1);
  });

  it('mostra o erro do server', async () => {
    await render(
      <AccountForm
        mode="create"
        initial={initialValues('checking')}
        paymentAccountOptions={bankOptions}
        onSubmit={jest.fn()}
        serverError="Não rolou criar agora."
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Não rolou criar agora.');
  });
});
