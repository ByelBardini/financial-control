import { act, renderHook } from '@testing-library/react-native';
import { useHoverReveal } from '../../src/hooks/useHoverReveal';

describe('useHoverReveal', () => {
  it('começa escondido', async () => {
    const { result } = await renderHook(() => useHoverReveal());
    expect(result.current.revealed).toBe(false);
  });

  it('hover mostra e esconde (mouse no PC)', async () => {
    const { result } = await renderHook(() => useHoverReveal());

    await act(async () => {
      result.current.onHoverIn();
    });
    expect(result.current.revealed).toBe(true);

    await act(async () => {
      result.current.onHoverOut();
    });
    expect(result.current.revealed).toBe(false);
  });

  it('toque mostra e esconde sozinho após 2s (mobile)', async () => {
    jest.useFakeTimers();
    try {
      const { result } = await renderHook(() => useHoverReveal());

      await act(async () => {
        result.current.onPress();
      });
      expect(result.current.revealed).toBe(true);

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });
      expect(result.current.revealed).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });

  it('toque com hover ativo não auto-esconde (mouse fica em cima)', async () => {
    jest.useFakeTimers();
    try {
      const { result } = await renderHook(() => useHoverReveal());

      await act(async () => {
        result.current.onHoverIn();
        result.current.onPress();
      });
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });
      expect(result.current.revealed).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });
});
