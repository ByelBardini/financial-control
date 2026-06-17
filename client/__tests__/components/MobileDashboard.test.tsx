import { screen, userEvent } from '@testing-library/react-native';
import * as api from '../../src/api/dashboard';
import { MobileDashboard } from '../../src/components/MobileDashboard';
import { mockDashboardApi, renderWithClient } from '../_support/renderWithClient';

jest.mock('../../src/api/dashboard');

beforeEach(() => {
  mockDashboardApi();
});

describe('MobileDashboard', () => {
  it('compõe todas as seções do mobile (cada uma resolve sua query)', async () => {
    await renderWithClient(<MobileDashboard hidden={false} onToggleHidden={jest.fn()} />);

    expect(screen.getByText('Pobrify')).toBeOnTheScreen(); // TopBar é estático (sem query)
    expect(await screen.findByText('Saldo do Mês')).toBeOnTheScreen();
    expect(await screen.findByRole('header', { name: 'Contas' })).toBeOnTheScreen();
    expect(await screen.findByRole('header', { name: 'Investimentos (Risos)' })).toBeOnTheScreen();
    expect(await screen.findByRole('header', { name: 'Gastos por Categoria' })).toBeOnTheScreen();
    expect(await screen.findByText('Diagnóstico Pobrify')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Início' })).toBeOnTheScreen(); // BottomNav estático
  });

  it('dispara onToggleHidden ao tocar no switch', async () => {
    const onToggleHidden = jest.fn();
    await renderWithClient(<MobileDashboard hidden={false} onToggleHidden={onToggleHidden} />);
    await screen.findByText('Saldo do Mês'); // espera as queries assentarem

    await userEvent.setup().press(screen.getByRole('switch', { name: 'Ocultar valores' }));
    expect(onToggleHidden).toHaveBeenCalledTimes(1);
  });

  it('o FAB de nova transação abre o speed dial e chama onCreateTransaction com o sentido', async () => {
    const onCreateTransaction = jest.fn();
    await renderWithClient(
      <MobileDashboard
        hidden={false}
        onToggleHidden={jest.fn()}
        onCreateTransaction={onCreateTransaction}
      />,
    );
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Nova transação' }));
    await user.press(screen.getByRole('button', { name: 'Despesa' }));

    expect(onCreateTransaction).toHaveBeenCalledWith('outflow');
  });

  it('mascara os valores quando hidden', async () => {
    await renderWithClient(<MobileDashboard hidden onToggleHidden={jest.fn()} />);
    await screen.findByText('Saldo do Mês'); // espera o BalanceHero carregar

    expect(screen.queryByText('R$ 1.284,50')).toBeNull();
    expect(screen.getAllByLabelText('valor oculto').length).toBeGreaterThan(0);
  });

  it('isola o erro: uma seção falha, mostra o erro só nela e o resto renderiza', async () => {
    jest.mocked(api.getCategories).mockRejectedValue(new Error('boom'));
    await renderWithClient(<MobileDashboard hidden={false} onToggleHidden={jest.fn()} />);

    // a seção que falhou vira erro + botão de retry
    expect(await screen.findByText('Não foi possível carregar as categorias.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeOnTheScreen();
    expect(screen.queryByRole('header', { name: 'Gastos por Categoria' })).toBeNull();

    // as outras seções seguem renderizando normalmente
    expect(await screen.findByText('Saldo do Mês')).toBeOnTheScreen();
    expect(await screen.findByText('Diagnóstico Pobrify')).toBeOnTheScreen();
  });
});
