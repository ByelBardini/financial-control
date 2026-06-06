import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { SectionError } from './SectionError';
import { SectionSkeleton } from './SectionSkeleton';

type QuerySectionProps<T> = {
  query: UseQueryResult<T>;
  children: (data: T) => ReactNode;
  label?: string; // contexto pro estado de erro (ex.: "contas")
};

// Gate genérico: mapeia o resultado de um useQuery para skeleton / erro / dados.
// Mantém os componentes de seção 100% prop-driven — eles nem sabem que há query.
// Após os guards de pending/error, query.data é não-undefined (children(data: T)).
export function QuerySection<T>({ query, children, label }: QuerySectionProps<T>) {
  if (query.isPending) return <SectionSkeleton />;
  if (query.isError) return <SectionError label={label} onRetry={() => void query.refetch()} />;
  return <>{children(query.data)}</>;
}

type QuerySection2Props<A, B> = {
  queryA: UseQueryResult<A>;
  queryB: UseQueryResult<B>;
  children: (a: A, b: B) => ReactNode;
  label?: string;
};

// Variante para seções que dependem de dois recursos (ex.: painéis de investimento
// e "este mês" no desktop): skeleton se algum carrega, erro se algum falha.
export function QuerySection2<A, B>({ queryA, queryB, children, label }: QuerySection2Props<A, B>) {
  if (queryA.isPending || queryB.isPending) return <SectionSkeleton />;
  if (queryA.isError || queryB.isError) {
    return (
      <SectionError
        label={label}
        onRetry={() => {
          void queryA.refetch();
          void queryB.refetch();
        }}
      />
    );
  }
  if (queryA.isSuccess && queryB.isSuccess) return <>{children(queryA.data, queryB.data)}</>;
  return null;
}
