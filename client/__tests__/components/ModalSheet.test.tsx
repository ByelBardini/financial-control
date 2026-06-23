import { render, screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ModalSheet, apiErrorMessage } from '../../src/components/ModalSheet';
import { ApiError } from '../../src/api/client';
import { useIsDesktop } from '../../src/hooks/useIsDesktop';

jest.mock('../../src/hooks/useIsDesktop');
const mockUseIsDesktop = useIsDesktop as jest.MockedFunction<typeof useIsDesktop>;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseIsDesktop.mockReturnValue(false);
});

describe('apiErrorMessage', () => {
  it('ApiError → a mensagem legível do server', () => {
    expect(apiErrorMessage(new ApiError('ticker já existe', 400))).toBe('ticker já existe');
  });

  it('erro genérico (truthy, não-ApiError) → mensagem padrão', () => {
    expect(apiErrorMessage(new Error('boom'))).toBe('Não rolou agora. Tenta de novo.');
    expect(apiErrorMessage(true)).toBe('Não rolou agora. Tenta de novo.');
  });

  it('falsy → undefined (sem erro)', () => {
    expect(apiErrorMessage(null)).toBeUndefined();
    expect(apiErrorMessage(undefined)).toBeUndefined();
    expect(apiErrorMessage('')).toBeUndefined();
  });
});

describe('ModalSheet', () => {
  it('mostra o título (header) e o conteúdo', async () => {
    await render(
      <ModalSheet title="Novo ativo" onClose={jest.fn()}>
        <Text>corpo do modal</Text>
      </ModalSheet>,
    );
    expect(screen.getByRole('header', { name: 'Novo ativo' })).toBeOnTheScreen();
    expect(screen.getByText('corpo do modal')).toBeOnTheScreen();
  });

  it('fecha ao tocar no backdrop', async () => {
    const onClose = jest.fn();
    await render(
      <ModalSheet title="X" onClose={onClose}>
        <Text>c</Text>
      </ModalSheet>,
    );
    await userEvent.setup().press(screen.getByLabelText('Fechar formulário'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('fecha pelo botão X', async () => {
    const onClose = jest.fn();
    await render(
      <ModalSheet title="X" onClose={onClose}>
        <Text>c</Text>
      </ModalSheet>,
    );
    await userEvent.setup().press(screen.getByRole('button', { name: 'Fechar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renderiza como diálogo central no desktop', async () => {
    mockUseIsDesktop.mockReturnValue(true);
    await render(
      <ModalSheet title="Desktop" onClose={jest.fn()}>
        <Text>c</Text>
      </ModalSheet>,
    );
    expect(screen.getByRole('header', { name: 'Desktop' })).toBeOnTheScreen();
  });
});
