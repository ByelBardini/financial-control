import { act, renderHook } from '@testing-library/react-native';
import { useHideValues } from '../../src/hooks/useHideValues';

describe('useHideValues', () => {
  it('começa visível e alterna a cada toggle', async () => {
    const { result } = await renderHook(() => useHideValues());
    expect(result.current.hidden).toBe(false);

    await act(async () => {
      result.current.toggle();
    });
    expect(result.current.hidden).toBe(true);

    await act(async () => {
      result.current.toggle();
    });
    expect(result.current.hidden).toBe(false);
  });
});
