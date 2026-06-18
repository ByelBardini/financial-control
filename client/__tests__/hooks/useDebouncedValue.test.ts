import { act, renderHook } from '@testing-library/react-native';
import { useDebouncedValue } from '../../src/hooks/useDebouncedValue';

describe('useDebouncedValue', () => {
  it('só reflete o novo valor após o delay sem novas mudanças', async () => {
    jest.useFakeTimers();
    try {
      const { result, rerender } = await renderHook(
        (props: { v: string }) => useDebouncedValue(props.v, 300),
        { initialProps: { v: 'a' } },
      );
      expect(result.current).toBe('a');

      await act(async () => {
        rerender({ v: 'ab' });
      });
      expect(result.current).toBe('a'); // ainda dentro do delay

      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      expect(result.current).toBe('ab');
    } finally {
      jest.useRealTimers();
    }
  });
});
