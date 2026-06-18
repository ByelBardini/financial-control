import { render, screen, userEvent } from '@testing-library/react-native';
import { TransactionForm } from '../../../src/components/transacoes/TransactionForm';
import { initialValues } from '../../../src/lib/transactionForm';
import type { Category } from '../../../src/types/transacoes';

const accounts = [
  { id: 'a1', name: 'Nubank', icon: 'account_balance' as const, dotColor: '#d0bcff' },
  { id: 'a2', name: 'Itaú', icon: 'account_balance' as const, dotColor: '#004990' },
];
const categories: Category[] = [
  { id: 'ce', name: 'Mercado', icon: 'shopping_basket', kind: 'expense' },
  { id: 'ci', name: 'Salário', icon: 'payments', kind: 'income' },
];

describe('TransactionForm — criar', () => {
  it('valida e bloqueia o submit quando vazio', async () => {
    const onSubmit = jest.fn();
    await render(
      <TransactionForm
        mode="create"
        initial={initialValues('2026-06-12')}
        accounts={accounts}
        categories={categories}
        onSubmit={onSubmit}
      />,
    );
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Adicionar transação' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
  });

  it('submete os valores do form quando válido', async () => {
    const onSubmit = jest.fn();
    await render(
      <TransactionForm
        mode="create"
        initial={{ ...initialValues('2026-06-12'), accountId: 'a1' }}
        accounts={accounts}
        categories={categories}
        onSubmit={onSubmit}
      />,
    );
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Valor'), '5000');
    await user.type(screen.getByLabelText('Descrição'), 'Mercado');
    await user.press(screen.getByRole('button', { name: 'Adicionar transação' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      accountId: 'a1',
      amountCents: 5000,
      description: 'Mercado',
      direction: 'outflow',
    });
  });

  it('mostra ícones nas opções de conta', async () => {
    await render(
      <TransactionForm
        mode="create"
        initial={{ ...initialValues('2026-06-12'), accountId: 'a1' }}
        accounts={accounts}
        categories={categories}
        onSubmit={jest.fn()}
      />,
    );
    const user = userEvent.setup();

    await user.press(screen.getByLabelText('Conta: Nubank'));
    expect(
      screen.getByTestId('select-option-icon-a1', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
  });

  it('não tem toggle Despesa/Receita (o sentido vem travado do menu)', async () => {
    await render(
      <TransactionForm
        mode="create"
        initial={{ ...initialValues('2026-06-12'), accountId: 'a1' }}
        accounts={accounts}
        categories={categories}
        onSubmit={jest.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Despesa' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Receita' })).toBeNull();
  });

  it('Parcelado: troca o rótulo pra "Valor da parcela" e mostra o campo Parcelas', async () => {
    await render(
      <TransactionForm
        mode="create"
        initial={{ ...initialValues('2026-06-12'), accountId: 'a1' }}
        accounts={accounts}
        categories={categories}
        onSubmit={jest.fn()}
      />,
    );
    const user = userEvent.setup();

    expect(screen.getByLabelText('Valor')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Parcelado' }));

    expect(screen.getByLabelText('Valor da parcela')).toBeOnTheScreen();
    expect(screen.getByLabelText(/^Parcelas:/)).toBeOnTheScreen();
  });

  it('Parcelado some quando o sentido é Receita (inflow)', async () => {
    await render(
      <TransactionForm
        mode="create"
        initial={{ ...initialValues('2026-06-12'), accountId: 'a1', direction: 'inflow' }}
        accounts={accounts}
        categories={categories}
        onSubmit={jest.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Parcelado' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Fixo' })).toBeOnTheScreen();
  });

  it('sem descrição, o submit não é bloqueado', async () => {
    const onSubmit = jest.fn();
    await render(
      <TransactionForm
        mode="create"
        initial={{ ...initialValues('2026-06-12'), accountId: 'a1' }}
        accounts={accounts}
        categories={categories}
        onSubmit={onSubmit}
      />,
    );
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Valor'), '5000'); // sem digitar Descrição
    await user.press(screen.getByRole('button', { name: 'Adicionar transação' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('Parcelado: submete entryKind parcelado + valor por parcela + nº de parcelas', async () => {
    const onSubmit = jest.fn();
    await render(
      <TransactionForm
        mode="create"
        initial={{ ...initialValues('2026-06-12'), accountId: 'a1' }}
        accounts={accounts}
        categories={categories}
        onSubmit={onSubmit}
      />,
    );
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Parcelado' }));
    await user.type(screen.getByLabelText('Valor da parcela'), '30000'); // R$ 300,00
    await user.type(screen.getByLabelText('Descrição'), 'Notebook');
    await user.press(screen.getByLabelText(/^Parcelas:/));
    await user.press(screen.getByRole('menuitem', { name: '3x' }));
    await user.press(screen.getByRole('button', { name: 'Adicionar transação' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      entryKind: 'parcelado',
      direction: 'outflow',
      amountCents: 30000,
      installmentCount: 3,
      description: 'Notebook',
    });
  });

  it('Fixo: revela a recorrência (frequência + término) e submete entryKind fixo', async () => {
    const onSubmit = jest.fn();
    await render(
      <TransactionForm
        mode="create"
        initial={{ ...initialValues('2026-06-12'), accountId: 'a1' }}
        accounts={accounts}
        categories={categories}
        onSubmit={onSubmit}
      />,
    );
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Fixo' }));
    expect(screen.getByLabelText(/^Frequência:/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Indefinido' })).toBeOnTheScreen();

    await user.type(screen.getByLabelText('Valor'), '320000');
    await user.type(screen.getByLabelText('Descrição'), 'Salário');
    await user.press(screen.getByRole('button', { name: 'Adicionar transação' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      entryKind: 'fixo',
      amountCents: 320000,
      description: 'Salário',
      frequency: 'monthly',
      endMode: 'forever',
    });
  });

  it('com sentido Receita, a Categoria lista só income (filtrada pelo direction do initial)', async () => {
    await render(
      <TransactionForm
        mode="create"
        initial={{ ...initialValues('2026-06-12'), accountId: 'a1', direction: 'inflow' }}
        accounts={accounts}
        categories={categories}
        onSubmit={jest.fn()}
      />,
    );
    const user = userEvent.setup();

    await user.press(screen.getByLabelText('Categoria: Sem categoria'));
    expect(screen.getByRole('menuitem', { name: 'Salário' })).toBeOnTheScreen();
    expect(screen.queryByRole('menuitem', { name: 'Mercado' })).toBeNull();
  });
});

describe('TransactionForm — editar', () => {
  it('trava a conta e mostra excluir', async () => {
    const onDelete = jest.fn();
    await render(
      <TransactionForm
        mode="edit"
        initial={{
          entryKind: 'unico',
          amountCents: 5000,
          direction: 'outflow',
          accountId: 'a2',
          categoryId: 'ce',
          description: 'Feira',
          occurredOn: '2026-06-10',
          installmentCount: 2,
          frequency: 'monthly',
          endMode: 'forever',
          endDate: '',
          occurrences: 12,
        }}
        accounts={accounts}
        categories={categories}
        onSubmit={jest.fn()}
        onDelete={onDelete}
      />,
    );
    const user = userEvent.setup();

    expect(screen.getByLabelText('Conta: Itaú')).toBeDisabled();

    await user.press(screen.getByRole('button', { name: 'Excluir transação' }));
    await user.press(screen.getByRole('button', { name: 'Confirmar exclusão' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
