import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { FormField } from '../auth/FormField';
import { useAssetSearch, type AssetSearch } from '../../hooks/useAssetSearch';
import { formatBRL } from '../../lib/money';
import type { AssetClass, CatalogoItem } from '../../types/investimentos';

type TickerAutocompleteProps = {
  value: string;
  onChangeText: (text: string) => void;
  onPick: (item: CatalogoItem) => void;
  assetClass: AssetClass;
  error?: string;
};

// Campo de Ticker com autocomplete: digita → busca ativos reais no catálogo (useAssetSearch) →
// escolhe uma sugestão (o parent preenche ticker/nome/preço via onPick) OU segue com o texto livre
// (fallback — submete o que foi digitado). A lista some ao escolher e reaparece ao digitar de novo
// (estado `open`, não foco — toque na sugestão nunca disputa com o blur). É inline (empurra o
// conteúdo) pra não ser cortada pelo ModalSheet. cripto não força maiúsculas (busca por nome);
// ações/FIIs sim (é o código). renda_fixa não chega aqui (o AssetForm usa campo simples).
export function TickerAutocomplete({
  value,
  onChangeText,
  onPick,
  assetClass,
  error,
}: TickerAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const search = useAssetSearch(assetClass, value);

  function handleChange(text: string) {
    setOpen(true);
    onChangeText(text);
  }

  function handlePick(item: CatalogoItem) {
    setOpen(false);
    onPick(item);
  }

  return (
    <View className="gap-stack-sm">
      <FormField
        label="Ticker"
        value={value}
        onChangeText={handleChange}
        placeholder={assetClass === 'cripto' ? 'Ex.: bitcoin' : 'Ex.: PETR4'}
        autoCapitalize={assetClass === 'cripto' ? 'none' : 'characters'}
        error={error}
      />
      {open && search.enabled ? <SearchDropdown search={search} onPick={handlePick} /> : null}
    </View>
  );
}

function SearchDropdown({
  search,
  onPick,
}: {
  search: AssetSearch;
  onPick: (item: CatalogoItem) => void;
}) {
  return (
    <View className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container">
      {search.isLoading ? (
        <DropdownMessage spinner>Buscando…</DropdownMessage>
      ) : search.isError ? (
        <DropdownMessage alert>
          Não deu pra buscar agora — pode digitar o ticker manualmente.
        </DropdownMessage>
      ) : search.items.length === 0 ? (
        <DropdownMessage>Nenhum ativo encontrado — confira o código (ex.: PETR4).</DropdownMessage>
      ) : (
        <ScrollView style={{ maxHeight: 200 }} keyboardShouldPersistTaps="handled">
          {search.items.map((item) => (
            <SuggestionRow key={item.ticker} item={item} onPress={() => onPick(item)} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function DropdownMessage({
  children,
  spinner,
  alert,
}: {
  children: string;
  spinner?: boolean;
  alert?: boolean;
}) {
  return (
    <View className="min-h-[44px] flex-row items-center gap-stack-sm px-gutter py-stack-md">
      {spinner ? <ActivityIndicator size="small" color="#cbc3d7" /> : null}
      <Text
        accessibilityRole={alert ? 'alert' : undefined}
        className="flex-1 text-label-md text-on-surface-variant"
      >
        {children}
      </Text>
    </View>
  );
}

function SuggestionRow({ item, onPress }: { item: CatalogoItem; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.ticker} ${item.name}`}
      className="min-h-[44px] flex-row items-center justify-between gap-stack-sm px-gutter py-stack-sm"
    >
      <View className="flex-1">
        <Text className="font-geist-medium text-label-md text-on-surface">{item.ticker}</Text>
        <Text numberOfLines={1} className="text-label-sm text-on-surface-variant">
          {item.name}
        </Text>
      </View>
      {item.priceCents > 0 ? (
        <Text className="font-geist-medium text-label-sm text-on-surface-variant">
          {formatBRL(item.priceCents)}
        </Text>
      ) : null}
    </Pressable>
  );
}
