import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import * as api from '../../../src/api/investimentos';
import { AssetForm } from '../../../src/components/investimentos/AssetForm';
import { initialAssetValues } from '../../../src/lib/assetForm';

// O campo de Ticker agora autocompleta (useAssetSearch → React Query), então o form precisa de um
// QueryClient e o catálogo é mockado (default []: sem sugestões, não toca a rede).
jest.mock('../../../src/api/investimentos');

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(api.getAssetCatalog).mockResolvedValue([]);
});

const makeWrapper = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return Wrapper;
};

describe('AssetForm — criar', () => {
  it('valida ticker/nome e bloqueia o submit quando vazio', async () => {
    const onSubmit = jest.fn();
    await render(<AssetForm mode="create" initial={initialAssetValues()} onSubmit={onSubmit} />, {
      wrapper: makeWrapper(),
    });
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Criar ativo' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
  });

  it('submete os valores convertidos quando válido (texto livre, sem escolher sugestão)', async () => {
    const onSubmit = jest.fn();
    await render(<AssetForm mode="create" initial={initialAssetValues()} onSubmit={onSubmit} />, {
      wrapper: makeWrapper(),
    });
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

  it('escolher uma sugestão preenche ticker, nome e preço', async () => {
    jest
      .mocked(api.getAssetCatalog)
      .mockResolvedValue([
        { ticker: 'PETR4', name: 'Petrobras PN', priceCents: 3806, logoUrl: 'u' },
      ]);
    const onSubmit = jest.fn();
    await render(<AssetForm mode="create" initial={initialAssetValues()} onSubmit={onSubmit} />, {
      wrapper: makeWrapper(),
    });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Ticker'), 'PETR');
    await user.press(await screen.findByRole('button', { name: 'PETR4 Petrobras PN' }));
    await user.press(screen.getByRole('button', { name: 'Criar ativo' }));

    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      ticker: 'PETR4',
      name: 'Petrobras PN',
      currentPriceCents: 3806,
    });
  });

  it('renda_fixa usa campo de texto simples (sem busca no catálogo)', async () => {
    const onSubmit = jest.fn();
    await render(
      <AssetForm mode="create" initial={initialAssetValues('renda_fixa')} onSubmit={onSubmit} />,
      { wrapper: makeWrapper() },
    );
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Ticker'), 'TESOURO');
    expect(api.getAssetCatalog).not.toHaveBeenCalled();
  });

  it('trocar a classe repõe o ícone padrão e submete a classe escolhida', async () => {
    const onSubmit = jest.fn();
    await render(<AssetForm mode="create" initial={initialAssetValues()} onSubmit={onSubmit} />, {
      wrapper: makeWrapper(),
    });
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
      { wrapper: makeWrapper() },
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
      { wrapper: makeWrapper() },
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Não rolou criar agora.');
  });

  it('modo criar NÃO mostra arquivar', async () => {
    await render(<AssetForm mode="create" initial={initialAssetValues()} onSubmit={jest.fn()} />, {
      wrapper: makeWrapper(),
    });
    expect(screen.queryByRole('button', { name: 'Arquivar ativo' })).toBeNull();
  });
});
