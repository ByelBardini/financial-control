import { QueryClient } from '@tanstack/react-query';

// Defaults do app: 1 retry (rede flaky), staleTime de 1 min (o dashboard não muda
// a cada segundo) e sem refetch ao focar a janela (evita flicker na web).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});
