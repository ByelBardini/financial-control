import { screen, userEvent } from '@testing-library/react-native';
import * as api from '../../src/api/contas';
import { MobileContas } from '../../src/components/MobileContas';
import { mockContasApi, renderWithClient } from '../_support/renderWithClient';

jest.mock('../../src/api/contas');

beforeEach(() => {
  jest.clearAllMocks();
  mockContasApi();
});

describe('MobileContas', () => {
  it('compõe todas as seções do mobile (cada uma resolve sua query)', async () => {
    await renderWithClient(
      <MobileContas
        hidden={false}
        onToggleHidden={jest.fn()}
        route="contas"
        onNavigate={jest.fn()}
      />,
    );

    expect(screen.getByText('Pobrify')).toBeOnTheScreen(); // TopBar é estático (sem query)
    expect(screen.getByText('Monitor de Sobrevivência')).toBeOnTheScreen(); // título estático
    expect(await screen.findByText('Tempo Estimado de Vida (Bancária)')).toBeOnTheScreen();
    expect(await screen.findByRole('header', { name: 'Bancos' })).toBeOnTheScreen();
    expect(await screen.findByRole('header', { name: 'Cartões' })).toBeOnTheScreen();
    expect(await screen.findByText('Nubank Roxinho')).toBeOnTheScreen();
    expect(await screen.findByRole('header', { name: 'Vales (Benefícios)' })).toBeOnTheScreen();
    expect(await screen.findByText('Carteira Física')).toBeOnTheScreen();
    expect(await screen.findByText('Dica de Gestão')).toBeOnTheScreen();
    expect(await screen.findByText('Nubank')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Contas' })).toBeSelected(); // BottomNav
  });

  it('dispara onToggleHidden ao tocar no switch', async () => {
    const onToggleHidden = jest.fn();
    await renderWithClient(<MobileContas hidden={false} onToggleHidden={onToggleHidden} />);
    await screen.findByText('Nubank'); // espera as queries assentarem

    await userEvent.setup().press(screen.getByRole('switch', { name: 'Ocultar valores' }));
    expect(onToggleHidden).toHaveBeenCalledTimes(1);
  });

  it('isola o erro: uma seção falha, mostra o erro só nela e o resto renderiza', async () => {
    jest.mocked(api.getVouchers).mockRejectedValue(new Error('boom'));
    await renderWithClient(<MobileContas hidden={false} onToggleHidden={jest.fn()} />);

    expect(await screen.findByText('Não foi possível carregar os vales.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeOnTheScreen();
    expect(screen.queryByRole('header', { name: 'Vales (Benefícios)' })).toBeNull();

    expect(screen.getByText('Monitor de Sobrevivência')).toBeOnTheScreen();
    expect(await screen.findByText('Nubank')).toBeOnTheScreen();
  });
});
