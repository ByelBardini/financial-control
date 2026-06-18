import { act, renderHook } from '@testing-library/react-native';
import { useTransactionEntry } from '../../src/hooks/useTransactionEntry';

describe('useTransactionEntry', () => {
  it('começa fechado: sem menu, sem âncora, sem form', async () => {
    const { result } = await renderHook(() => useTransactionEntry());
    expect(result.current.menuOpen).toBe(false);
    expect(result.current.menuAnchor).toBeUndefined();
    expect(result.current.form).toBeNull();
  });

  it('openMenu abre e grava a âncora medida', async () => {
    const { result } = await renderHook(() => useTransactionEntry());
    const anchor = { x: 10, y: 20, width: 120, height: 40 };
    await act(async () => result.current.openMenu(anchor));
    expect(result.current.menuOpen).toBe(true);
    expect(result.current.menuAnchor).toEqual(anchor);
  });

  it('openMenu sem âncora apenas abre (fallback de posição)', async () => {
    const { result } = await renderHook(() => useTransactionEntry());
    await act(async () => result.current.openMenu());
    expect(result.current.menuOpen).toBe(true);
    expect(result.current.menuAnchor).toBeUndefined();
  });

  it('openCreate semeia o form de criação com o sentido', async () => {
    const { result } = await renderHook(() => useTransactionEntry());
    await act(async () => result.current.openCreate('inflow'));
    expect(result.current.form).toEqual({ mode: 'create', direction: 'inflow' });
  });

  it('openEdit semeia o form de edição com o id', async () => {
    const { result } = await renderHook(() => useTransactionEntry());
    await act(async () => result.current.openEdit('t1'));
    expect(result.current.form).toEqual({ mode: 'edit', id: 't1' });
  });

  it('pick fecha o menu e abre a criação no sentido escolhido', async () => {
    const { result } = await renderHook(() => useTransactionEntry());
    await act(async () => result.current.openMenu());
    await act(async () => result.current.pick('outflow'));
    expect(result.current.menuOpen).toBe(false);
    expect(result.current.form).toEqual({ mode: 'create', direction: 'outflow' });
  });

  it('closeMenu fecha o menu; closeForm zera o form', async () => {
    const { result } = await renderHook(() => useTransactionEntry());
    await act(async () => result.current.openMenu());
    await act(async () => result.current.closeMenu());
    expect(result.current.menuOpen).toBe(false);

    await act(async () => result.current.openEdit('t1'));
    await act(async () => result.current.closeForm());
    expect(result.current.form).toBeNull();
  });
});
