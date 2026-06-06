import { screen, userEvent } from '@testing-library/react-native';
import * as api from '../../../src/api/dashboard';
import { DesktopDashboard } from '../../../src/components/desktop/DesktopDashboard';
import { mockDashboardApi, renderWithClient } from '../../_support/renderWithClient';

jest.mock('../../../src/api/dashboard');

beforeEach(() => {
  mockDashboardApi();
});

describe('DesktopDashboard', () => {
  it('compõe sidebar, header e todos os painéis do grid', async () => {
    await renderWithClient(<DesktopDashboard hidden={false} onToggleHidden={jest.fn()} />);

    expect(screen.getByText('Visão Geral')).toBeOnTheScreen(); // SideNav é estático
    expect(screen.getByRole('button', { name: 'Investimentos' })).toBeOnTheScreen();
    expect(await screen.findByText('Disponível para gastar')).toBeOnTheScreen();
    expect(await screen.findByText('Você gastou 59% da sua receita.')).toBeOnTheScreen();
    expect(await screen.findByText('Bitcoin')).toBeOnTheScreen();
    expect(await screen.findByText('R$ 2.734,50')).toBeOnTheScreen();
  });

  it('dispara onToggleHidden a partir do header', async () => {
    const onToggleHidden = jest.fn();
    await renderWithClient(<DesktopDashboard hidden={false} onToggleHidden={onToggleHidden} />);
    await screen.findByText('Disponível para gastar'); // espera as queries assentarem

    await userEvent.setup().press(screen.getByRole('switch', { name: 'Ocultar valores' }));
    expect(onToggleHidden).toHaveBeenCalledTimes(1);
  });

  it('isola erro de painel com dupla dependência (QuerySection2) sem derrubar o resto', async () => {
    // EsteMesPanel depende de esteMes + diagnosis; basta uma falhar pro painel virar erro
    jest.mocked(api.getEsteMes).mockRejectedValue(new Error('boom'));
    await renderWithClient(<DesktopDashboard hidden={false} onToggleHidden={jest.fn()} />);

    expect(
      await screen.findByText('Não foi possível carregar o panorama do mês.'),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeOnTheScreen();

    // o resto do grid segue de pé
    expect(await screen.findByText('Disponível para gastar')).toBeOnTheScreen();
    expect(await screen.findByText('Bitcoin')).toBeOnTheScreen();
  });
});
