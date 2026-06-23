import { screen, userEvent } from '@testing-library/react-native';
import { DesktopInvestimentos } from '../../../src/components/desktop/DesktopInvestimentos';
import { mockInvestimentosApi, renderWithClient } from '../../_support/renderWithClient';

jest.mock('../../../src/api/investimentos');

beforeEach(() => {
  jest.clearAllMocks();
  mockInvestimentosApi();
});

describe('DesktopInvestimentos', () => {
  it('compõe o portfólio geral com a tabela "Registro de Quedas" e suas colunas', async () => {
    await renderWithClient(
      <DesktopInvestimentos
        hidden={false}
        onToggleHidden={jest.fn()}
        route="investimentos"
        onNavigate={jest.fn()}
      />,
    );

    expect(await screen.findByRole('header', { name: 'Portfólio de Ilusões' })).toBeOnTheScreen();
    expect(await screen.findByRole('header', { name: 'Registro de Quedas' })).toBeOnTheScreen();
    expect(screen.getByText('Investido')).toBeOnTheScreen();
    expect(screen.getByText('Valor Atual')).toBeOnTheScreen();
    expect(screen.getByText('Ganho/Perda')).toBeOnTheScreen();
    expect(await screen.findByText('PETR4')).toBeOnTheScreen();
  });

  it('mostra a cripto num bloco à parte e a avaliação de risco', async () => {
    await renderWithClient(
      <DesktopInvestimentos hidden={false} onToggleHidden={jest.fn()} route="investimentos" />,
    );

    expect(
      await screen.findByRole('header', { name: 'O Circo da Volatilidade' }),
    ).toBeOnTheScreen();
    expect(await screen.findByText('Avaliação de Risco')).toBeOnTheScreen();
  });

  it('marca Investimentos na SideNav e expõe o toggle de ocultar (sem botão de aporte)', async () => {
    const onToggleHidden = jest.fn();
    await renderWithClient(
      <DesktopInvestimentos
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

  it('"Novo ativo" no header cadastra e a linha de posição abre o ativo', async () => {
    const onCreateAsset = jest.fn();
    const onOpenAsset = jest.fn();
    await renderWithClient(
      <DesktopInvestimentos
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
