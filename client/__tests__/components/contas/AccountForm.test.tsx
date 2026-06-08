import { render, screen, userEvent } from '@testing-library/react-native';
import { AccountForm } from '../../../src/components/contas/AccountForm';
import { initialValues } from '../../../src/lib/accountForm';

describe('AccountForm', () => {
  it('cria: valida o nome e envia os valores convertidos', async () => {
    const onSubmit = jest.fn();
    await render(
      <AccountForm mode="create" initial={initialValues('checking')} onSubmit={onSubmit} />,
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
      <AccountForm mode="create" initial={initialValues('checking')} onSubmit={onSubmit} />,
    );
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Cartão' }));
    expect(screen.getByLabelText('Limite de crédito')).toBeOnTheScreen();

    await user.type(screen.getByLabelText('Nome'), 'Nubank Cartão');
    await user.press(screen.getByRole('button', { name: 'Criar conta' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/limite/i);
  });

  it('edita: sem campo de saldo e com arquivar (confirmação)', async () => {
    const onArchive = jest.fn();
    await render(
      <AccountForm
        mode="edit"
        initial={{ ...initialValues('checking'), name: 'Nubank' }}
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
        onSubmit={jest.fn()}
        serverError="Não rolou criar agora."
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Não rolou criar agora.');
  });
});
