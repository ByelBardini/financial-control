import type { UseQueryResult } from '@tanstack/react-query';
import { render, screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { QuerySection, QuerySection2 } from '../../src/components/QuerySection';

type Slice = { name: string };

// Fakes nomeados do resultado de useQuery: o gate só lê isPending/isError/
// isSuccess/data/refetch, então montamos só esses campos (cast pra não recriar a
// union gigante do React Query). Mantém o teste do gate isolado da rede.
const pending = () =>
  ({ isPending: true, isError: false, isSuccess: false }) as unknown as UseQueryResult<Slice>;

const errored = (refetch: () => void) =>
  ({
    isPending: false,
    isError: true,
    isSuccess: false,
    refetch,
  }) as unknown as UseQueryResult<Slice>;

const ok = (data: Slice, refetch: () => void = () => {}) =>
  ({
    isPending: false,
    isError: false,
    isSuccess: true,
    data,
    refetch,
  }) as unknown as UseQueryResult<Slice>;

describe('QuerySection', () => {
  it('mostra o skeleton enquanto a query está pendente', async () => {
    await render(<QuerySection query={pending()}>{(d) => <Text>{d.name}</Text>}</QuerySection>);

    expect(screen.getByLabelText('Carregando')).toBeOnTheScreen();
    expect(screen.queryByText('Nubank')).toBeNull();
  });

  it('mostra erro com o label da seção quando a query falha', async () => {
    await render(
      <QuerySection query={errored(jest.fn())} label="as contas">
        {(d) => <Text>{d.name}</Text>}
      </QuerySection>,
    );

    expect(screen.getByText('Não foi possível carregar as contas.')).toBeOnTheScreen();
  });

  it('o botão "Tentar de novo" chama refetch', async () => {
    const refetch = jest.fn();
    await render(
      <QuerySection query={errored(refetch)} label="as contas">
        {(d) => <Text>{d.name}</Text>}
      </QuerySection>,
    );

    await userEvent.setup().press(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('renderiza os filhos com os dados em caso de sucesso', async () => {
    await render(
      <QuerySection query={ok({ name: 'Nubank' })}>{(d) => <Text>{d.name}</Text>}</QuerySection>,
    );

    expect(screen.getByText('Nubank')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Carregando')).toBeNull();
  });
});

describe('QuerySection2', () => {
  it('mostra o skeleton se qualquer uma das queries está pendente', async () => {
    await render(
      <QuerySection2 queryA={pending()} queryB={ok({ name: 'B' })}>
        {(a, b) => (
          <Text>
            {a.name}
            {b.name}
          </Text>
        )}
      </QuerySection2>,
    );

    expect(screen.getByLabelText('Carregando')).toBeOnTheScreen();
  });

  it('mostra erro se qualquer uma falha e o retry refaz as duas', async () => {
    const refetchA = jest.fn();
    const refetchB = jest.fn();
    await render(
      <QuerySection2
        queryA={errored(refetchA)}
        queryB={ok({ name: 'B' }, refetchB)}
        label="os investimentos"
      >
        {(a, b) => (
          <Text>
            {a.name}
            {b.name}
          </Text>
        )}
      </QuerySection2>,
    );

    expect(screen.getByText('Não foi possível carregar os investimentos.')).toBeOnTheScreen();

    await userEvent.setup().press(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(refetchA).toHaveBeenCalledTimes(1);
    expect(refetchB).toHaveBeenCalledTimes(1);
  });

  it('renderiza os filhos com os dois dados quando ambas têm sucesso', async () => {
    await render(
      <QuerySection2 queryA={ok({ name: 'BTC' })} queryB={ok({ name: 'Carteira' })}>
        {(a, b) => (
          <Text>
            {a.name} + {b.name}
          </Text>
        )}
      </QuerySection2>,
    );

    expect(screen.getByText('BTC + Carteira')).toBeOnTheScreen();
  });
});
