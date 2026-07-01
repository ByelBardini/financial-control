/**
 * @jest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react-native';
import { useUrlRoute } from '../../src/navigation/useUrlRoute.web';

beforeEach(() => {
  window.history.pushState(null, '', '/');
});

describe('useUrlRoute (web)', () => {
  it('deriva a rota inicial do pathname do browser', async () => {
    window.history.pushState(null, '', '/transacoes');

    const { result } = await renderHook(() => useUrlRoute());

    expect(result.current[0]).toBe('transacoes');
  });

  it('navegar escreve o caminho na URL (pushState) e atualiza o estado', async () => {
    const pushState = jest.spyOn(window.history, 'pushState');
    const { result } = await renderHook(() => useUrlRoute());

    await act(async () => {
      result.current[1]('contas');
    });

    expect(result.current[0]).toBe('contas');
    expect(pushState).toHaveBeenCalledWith(null, '', '/contas');
    expect(window.location.pathname).toBe('/contas');
    pushState.mockRestore();
  });

  it('voltar/avançar do browser (popstate) re-deriva a rota', async () => {
    const { result } = await renderHook(() => useUrlRoute());

    await act(async () => {
      result.current[1]('investimentos');
    });
    expect(result.current[0]).toBe('investimentos');

    await act(async () => {
      window.history.pushState(null, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current[0]).toBe('dashboard');
  });

  it('remove o listener de popstate no unmount', async () => {
    const removeEventListener = jest.spyOn(window, 'removeEventListener');
    const { unmount } = await renderHook(() => useUrlRoute());

    await act(async () => {
      unmount();
    });

    expect(removeEventListener).toHaveBeenCalledWith('popstate', expect.any(Function));
    removeEventListener.mockRestore();
  });
});
