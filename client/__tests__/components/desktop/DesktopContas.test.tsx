import { screen, userEvent } from '@testing-library/react-native';
import * as api from '../../../src/api/contas';
import { DesktopContas } from '../../../src/components/desktop/DesktopContas';
import { mockContasApi, renderWithClient } from '../../_support/renderWithClient';

jest.mock('../../../src/api/contas');

beforeEach(() => {
  jest.clearAllMocks();
  mockContasApi();
});

describe('DesktopContas', () => {
  it('compõe sidebar, header e todos os painéis', async () => {
    await renderWithClient(
      <DesktopContas
        hidden={false}
        onToggleHidden={jest.fn()}
        route="contas"
        onNavigate={jest.fn()}
      />,
    );

    expect(await screen.findByText('Monitor de Sobrevivência')).toBeOnTheScreen();
    expect(await screen.findByRole('header', { name: 'Bancos' })).toBeOnTheScreen();
    expect(await screen.findByRole('header', { name: 'Vales (Benefícios)' })).toBeOnTheScreen();
    expect(await screen.findByRole('header', { name: 'Raio-X de Pobreza' })).toBeOnTheScreen();
    expect(await screen.findByText('Dica de Gestão')).toBeOnTheScreen();
    expect(await screen.findByText('Nubank')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Contas' })).toBeSelected(); // SideNav
  });

  it('alterna ocultar valores pelo header', async () => {
    const onToggleHidden = jest.fn();
    await renderWithClient(
      <DesktopContas
        hidden={false}
        onToggleHidden={onToggleHidden}
        route="contas"
        onNavigate={jest.fn()}
      />,
    );

    await userEvent.setup().press(await screen.findByRole('switch', { name: 'Ocultar valores' }));
    expect(onToggleHidden).toHaveBeenCalledTimes(1);
  });

  it('isola o erro: um painel falha sem derrubar o resto', async () => {
    jest.mocked(api.getPovertyXray).mockRejectedValue(new Error('boom'));
    await renderWithClient(
      <DesktopContas
        hidden={false}
        onToggleHidden={jest.fn()}
        route="contas"
        onNavigate={jest.fn()}
      />,
    );

    expect(await screen.findByText('Não foi possível carregar o raio-x.')).toBeOnTheScreen();
    expect(screen.queryByRole('header', { name: 'Raio-X de Pobreza' })).toBeNull();

    expect(await screen.findByRole('header', { name: 'Bancos' })).toBeOnTheScreen();
    expect(await screen.findByText('Nubank')).toBeOnTheScreen();
  });
});
