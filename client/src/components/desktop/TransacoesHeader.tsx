import { Pressable, Text, View } from 'react-native';
import { HideValuesToggle } from '../HideValuesToggle';
import { Icon } from '../Icon';
import { TransactionSearch } from '../TransactionSearch';

type TransacoesHeaderProps = {
  hidden: boolean;
  onToggleHidden: () => void;
  searchText: string;
  onSearchChange: (text: string) => void;
};

// Cabeçalho da página de Transações no desktop: título + subtítulo à esquerda; busca
// (funcional, debounçada na tela), switch de ocultar valores e "Nova transação" (ainda
// visual — sem modal) à direita.
export function TransacoesHeader({
  hidden,
  onToggleHidden,
  searchText,
  onSearchChange,
}: TransacoesHeaderProps) {
  return (
    <View className="flex-row items-end justify-between border-b border-grid-line px-container-margin py-stack-lg">
      <View className="gap-base">
        <Text
          accessibilityRole="header"
          className="font-hanken-bold text-display-lg uppercase text-on-surface"
        >
          Transações
        </Text>
        <Text className="font-geist-medium text-label-md text-on-surface-variant">
          Rastreando cada centavo em fuga.
        </Text>
      </View>

      <View className="flex-row items-center gap-stack-md">
        <View className="w-48">
          <TransactionSearch value={searchText} onChange={onSearchChange} compact />
        </View>

        <HideValuesToggle hidden={hidden} onToggleHidden={onToggleHidden} />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Nova transação"
          className="flex-row items-center gap-stack-sm rounded-lg bg-surface-container-highest px-stack-md py-base"
        >
          <Icon name="add" size={16} color="#d0bcff" />
          <Text className="font-geist-semibold text-label-sm text-primary">NOVA TRANSAÇÃO</Text>
        </Pressable>
      </View>
    </View>
  );
}
