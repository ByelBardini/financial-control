import { Pressable, Text, View } from 'react-native';
import { HideValuesToggle } from '../HideValuesToggle';
import { Icon } from '../Icon';

type TransacoesHeaderProps = { hidden: boolean; onToggleHidden: () => void };

// Cabeçalho da página de Transações no desktop: título + subtítulo à esquerda; switch
// de ocultar valores, busca e "Nova transação" à direita. Busca e "Nova transação" são
// VISUAIS nesta passada (sem filtro nem modal ainda — viram funcionais com o backend).
export function TransacoesHeader({ hidden, onToggleHidden }: TransacoesHeaderProps) {
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
        <View className="flex-row items-center gap-stack-sm rounded-full border border-outline-variant bg-surface-container-lowest px-stack-md py-base">
          <Icon name="search" size={20} color="#cbc3d7" />
          <Text className="font-geist-medium text-label-md text-on-surface-variant">
            Filtrar eventos...
          </Text>
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
