import { render, screen, userEvent } from '@testing-library/react-native';
import { AssetForm } from '../../../src/components/investimentos/AssetForm';
import { initialAssetValues } from '../../../src/lib/assetForm';

describe('AssetForm — criar', () => {
  it('valida ticker/nome e bloqueia o submit quando vazio', async () => {
    const onSubmit = jest.fn();
    await render(<AssetForm mode="create" initial={initialAssetValues()} onSubmit={onSubmit} />);
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Criar ativo' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
  });

  it('submete os valores convertidos quando válido', async () => {
    const onSubmit = jest.fn();
    await render(<AssetForm mode="create" initial={initialAssetValues()} onSubmit={onSubmit} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Ticker'), 'WEGE3');
    await user.type(screen.getByLabelText('Nome'), 'WEG ON');
    await user.type(screen.getByLabelText('Preço atual'), '5000');
    await user.press(screen.getByRole('button', { name: 'Criar ativo' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      ticker: 'WEGE3',
      name: 'WEG ON',
      assetClass: 'acoes',
      currentPriceCents: 5000,
    });
  });

  it('trocar a classe repõe o ícone padrão e submete a classe escolhida', async () => {
    const onSubmit = jest.fn();
    await render(<AssetForm mode="create" initial={initialAssetValues()} onSubmit={onSubmit} />);
    const user = userEvent.setup();

    await user.press(screen.getByLabelText('Classe: Ações'));
    await user.press(screen.getByRole('menuitem', { name: 'Cripto' }));

    await user.type(screen.getByLabelText('Ticker'), 'BTC');
    await user.type(screen.getByLabelText('Nome'), 'Bitcoin');
    await user.press(screen.getByRole('button', { name: 'Criar ativo' }));

    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      assetClass: 'cripto',
      icon: 'currency_bitcoin',
    });
  });
});

describe('AssetForm — editar', () => {
  it('trava a classe e mostra arquivar (confirmação)', async () => {
    const onArchive = jest.fn();
    await render(
      <AssetForm
        mode="edit"
        initial={{ ...initialAssetValues('fiis'), ticker: 'MXRF11', name: 'Maxi Renda' }}
        onSubmit={jest.fn()}
        onArchive={onArchive}
      />,
    );
    const user = userEvent.setup();

    expect(screen.getByLabelText('Classe: FIIs')).toBeDisabled();

    await user.press(screen.getByRole('button', { name: 'Arquivar ativo' }));
    await user.press(screen.getByRole('button', { name: 'Confirmar arquivamento' }));
    expect(onArchive).toHaveBeenCalledTimes(1);
  });

  it('mostra o erro do server', async () => {
    await render(
      <AssetForm
        mode="create"
        initial={initialAssetValues()}
        onSubmit={jest.fn()}
        serverError="Não rolou criar agora."
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Não rolou criar agora.');
  });
});
