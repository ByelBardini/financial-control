import { Text, View } from 'react-native';
import { HideValuesToggle } from '../HideValuesToggle';
import { Icon } from '../Icon';

type DesktopHeaderProps = {
  hidden: boolean;
  onToggleHidden: () => void;
};

// Cabeçalho do desktop: título + pílulas de mês/ocultar valores + ação primária.
export function DesktopHeader({ hidden, onToggleHidden }: DesktopHeaderProps) {
  return (
    <View className="flex-row items-center justify-between border-b border-grid-line px-container-margin py-base">
      <View>
        <Text className="font-hanken-bold text-headline-sm uppercase text-on-surface">
          Visão Geral
        </Text>
        <Text className="font-geist-medium text-label-md text-on-surface-variant">
          Bem-vindo à sua realidade financeira.
        </Text>
      </View>

      <View className="flex-row items-center gap-stack-md">
        <View className="flex-row items-center gap-stack-sm rounded-full border border-outline-variant bg-surface-container-lowest px-stack-md py-base">
          <View className="h-2 w-2 rounded-full bg-secondary" />
          <Text className="font-geist-medium text-label-sm text-on-surface-variant">
            Junho 2026
          </Text>
        </View>

        <HideValuesToggle hidden={hidden} onToggleHidden={onToggleHidden} />

        <View className="flex-row items-center gap-stack-sm rounded-lg bg-surface-container-highest px-stack-md py-base">
          <Icon name="add" size={16} color="#d0bcff" />
          <Text className="font-geist-semibold text-label-sm text-primary">Nova transação</Text>
        </View>
      </View>
    </View>
  );
}
