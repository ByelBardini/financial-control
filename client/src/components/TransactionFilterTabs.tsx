import { Text, View } from 'react-native';

type TransactionFilterTabsProps = { tabs: string[]; activeIndex?: number };

// Abas de filtro (Recentes / 30 Dias / Categorias). Nesta passada são VISUAIS: marcam
// a aba ativa (accessibilityState selected) mas ainda não filtram — o filtro real vem
// junto com o backend. role="tab" pra leitor de tela anunciar a seleção.
export function TransactionFilterTabs({ tabs, activeIndex = 0 }: TransactionFilterTabsProps) {
  return (
    <View className="flex-row gap-stack-sm">
      {tabs.map((tab, index) => {
        const active = index === activeIndex;
        return (
          <View
            key={tab}
            accessible
            accessibilityRole="tab"
            accessibilityLabel={tab}
            accessibilityState={{ selected: active }}
            className={`rounded-full px-stack-md py-stack-sm ${
              active ? 'bg-surface-container-highest' : 'border border-outline-variant'
            }`}
          >
            <Text
              className={`font-geist-semibold text-label-sm ${
                active ? 'text-primary' : 'text-on-surface-variant'
              }`}
            >
              {tab}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
