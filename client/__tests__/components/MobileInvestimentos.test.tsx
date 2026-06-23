import { screen, userEvent } from '@testing-library/react-native';
import { MobileInvestimentos } from '../../src/components/MobileInvestimentos';
import { mockInvestimentosApi, renderWithClient } from '../_support/renderWithClient';

jest.mock('../../src/api/investimentos');

beforeEach(() => {
  jest.clearAllMocks();
  mockInvestimentosApi();
});

describe('MobileInvestimentos', () => {
  it('compõe todas as seções (cada uma resolve sua query)', async () => {
    await renderWithClient(
      <MobileInvestimentos
        hidden={false}
        onToggleHidden={jest.fn()}
        route="investimentos"
        onNavigate={jest.fn()}
      />,
    );

    expect(await screen.findByRole('header', { name: 'Portfólio de Ilusões' })).toBeOnTheScreen();
    expect(await screen.findByRole('header', { name: 'Alocação por Classe' })).toBeOnTheScreen();
    expect(await screen.findByRole('header', { name: 'Registro de Quedas' })).toBeOnTheScreen();
    expect(await screen.findByText('PETR4')).toBeOnTheScreen();
    expect(
      await screen.findByRole('header', { name: 'O Circo da Volatilidade' }),
    ).toBeOnTheScreen();
    expect(await screen.findByText('BTC')).toBeOnTheScreen();
    expect(await screen.findByText('Avaliação de Risco')).toBeOnTheScreen();
  });

  it('marca Investimentos no BottomNav e dispara o toggle de ocultar', async () => {
    const onToggleHidden = jest.fn();
    await renderWithClient(
      <MobileInvestimentos
        hidden={false}
        onToggleHidden={onToggleHidden}
        route="investimentos"
        onNavigate={jest.fn()}
      />,
    );
    await screen.findByText('PETR4');

    expect(screen.getByRole('button', { name: 'Investimentos' })).toBeSelected();
    await userEvent.setup().press(screen.getByRole('switch', { name: 'Ocultar valores' }));
    expect(onToggleHidden).toHaveBeenCalledTimes(1);
  });

  it('FAB "Novo ativo" cadastra e tocar numa posição abre o ativo', async () => {
    const onCreateAsset = jest.fn();
    const onOpenAsset = jest.fn();
    await renderWithClient(
      <MobileInvestimentos
        hidden={false}
        onToggleHidden={jest.fn()}
        onCreateAsset={onCreateAsset}
        onOpenAsset={onOpenAsset}
      />,
    );
    await screen.findByText('PETR4');
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Novo ativo' }));
    expect(onCreateAsset).toHaveBeenCalledTimes(1);

    await user.press(screen.getByRole('button', { name: 'Abrir PETR4' }));
    expect(onOpenAsset).toHaveBeenCalledWith('petr4');
  });
});
