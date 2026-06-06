import { useCallback, useState } from 'react';

// Estado único do "ocultar valores", possuído pela tela e propagado aos
// MoneyText. toggle é estável (useCallback) para não re-renderizar à toa.
export function useHideValues(initial = false): { hidden: boolean; toggle: () => void } {
  const [hidden, setHidden] = useState(initial);
  const toggle = useCallback(() => setHidden((prev) => !prev), []);
  return { hidden, toggle };
}
