import { useQuery } from '@tanstack/react-query';
import { getAssetCatalog } from '../api/investimentos';
import type { AssetClass, CatalogoItem } from '../types/investimentos';
import { useDebouncedValue } from './useDebouncedValue';

// Mínimo de caracteres pra disparar a busca externa — espelha o server e protege a cota grátis.
const MIN_QUERY = 2;

// renda_fixa não tem catálogo externo (preço é manual); só as classes cotáveis buscam.
function isSearchable(assetClass: AssetClass): boolean {
  return assetClass === 'acoes' || assetClass === 'fiis' || assetClass === 'cripto';
}

export type AssetSearch = {
  items: CatalogoItem[];
  isLoading: boolean;
  isError: boolean;
  enabled: boolean;
};

// useAssetSearch alimenta o autocomplete do cadastro: debounce de 300ms (useDebouncedValue) +
// React Query (cache por classe+termo, staleTime 5min pra não rebater a API em idas-e-vindas;
// placeholderData segura os itens anteriores e evita flicker entre teclas). Só dispara em classe
// cotável e termo (após trim) com ao menos 2 chars — renda_fixa e termo curto ficam desligados,
// sem nenhuma chamada externa.
export function useAssetSearch(assetClass: AssetClass, query: string): AssetSearch {
  const debounced = useDebouncedValue(query.trim(), 300);
  const enabled = isSearchable(assetClass) && debounced.length >= MIN_QUERY;

  const result = useQuery({
    queryKey: ['investimentos', 'catalogo', assetClass, debounced],
    queryFn: () => getAssetCatalog(assetClass, debounced),
    enabled,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  return {
    items: result.data ?? [],
    isLoading: result.isLoading,
    isError: result.isError,
    enabled,
  };
}
