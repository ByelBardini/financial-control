import { useEffect, useState } from 'react';

// Debounce: devolve `value` só depois de `delay`ms sem mudanças. Usado pela busca pra não
// disparar uma query (rede) a cada tecla.
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
