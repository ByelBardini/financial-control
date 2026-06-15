import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text } from 'react-native';
import { Icon } from './Icon';
import type { Category } from '../types/transacoes';

type CategoryFilterProps = {
  categories: Category[];
  value: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
};

// Filtro de categoria MULTI-seleção. O modal fica aberto ao escolher (marca/desmarca várias);
// "Todas as categorias" limpa, "Pronto" fecha. Combina (AND) com tempo + busca; as categorias
// entre si são OR (no server). Rótulo do botão: Todas / 1 categoria / N categorias.
export function CategoryFilter({ categories, value, onToggle, onClear }: CategoryFilterProps) {
  const [open, setOpen] = useState(false);
  const label =
    value.length === 0
      ? 'Todas as categorias'
      : value.length === 1
        ? (categories.find((c) => c.id === value[0])?.name ?? '1 categoria')
        : `${value.length} categorias`;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Filtrar por categoria: ${label}`}
        hitSlop={8}
        className="min-h-[44px] flex-row items-center gap-stack-sm rounded-full border border-outline-variant px-stack-md"
      >
        <Icon name="filter_list" size={16} color="#cbc3d7" />
        <Text className="font-geist-semibold text-label-sm text-on-surface-variant">{label}</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          onPress={() => setOpen(false)}
          accessibilityLabel="Fechar"
          className="flex-1 items-center justify-center bg-black/50 px-container-margin"
        >
          <Pressable
            onPress={() => {}}
            className="w-full rounded-xl border border-outline-variant bg-surface-container p-stack-md"
            style={{ maxWidth: 360 }}
          >
            <Text
              accessibilityRole="header"
              className="mb-stack-md font-hanken-semibold text-headline-sm text-on-surface"
            >
              Categorias
            </Text>
            <ScrollView style={{ maxHeight: 320 }}>
              <CategoryOption
                label="Todas as categorias"
                checked={value.length === 0}
                onPress={onClear}
              />
              {categories.map((category) => (
                <CategoryOption
                  key={category.id}
                  label={category.name}
                  checked={value.includes(category.id)}
                  onPress={() => onToggle(category.id)}
                />
              ))}
            </ScrollView>
            <Pressable
              onPress={() => setOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Pronto"
              className="mt-stack-md min-h-[44px] items-center justify-center rounded-lg bg-surface-container-highest"
            >
              <Text className="font-geist-semibold text-label-md text-primary">Pronto</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

type CategoryOptionProps = { label: string; checked: boolean; onPress: () => void };

function CategoryOption({ label, checked, onPress }: CategoryOptionProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      className="min-h-[44px] flex-row items-center justify-between rounded-lg px-stack-sm"
    >
      <Text
        className={`font-geist-medium text-label-md ${checked ? 'text-primary' : 'text-on-surface'}`}
      >
        {label}
      </Text>
      {checked ? <Icon name="check" size={18} color="#d0bcff" /> : null}
    </Pressable>
  );
}
