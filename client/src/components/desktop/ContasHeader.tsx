import { Pressable, Text, View } from 'react-native';
import { HideValuesToggle } from '../HideValuesToggle';
import { Icon } from '../Icon';

type ContasHeaderProps = {
  hidden: boolean;
  onToggleHidden: () => void;
  onCreateAccount?: () => void;
};

// Cabeçalho da página de Contas no desktop: título à esquerda; switch de ocultar
// valores + ação "Nova conta" à direita. Sem balanço agregado ("Patrimônio
// Líquido") — a tela foca no saldo de cada conta + o cartão (Raio-X), não num total.
export function ContasHeader({ hidden, onToggleHidden, onCreateAccount }: ContasHeaderProps) {
  return (
    <View className="flex-row items-end justify-between border-b border-grid-line px-container-margin py-stack-lg">
      <View className="gap-base">
        <Text className="font-geist-semibold text-label-sm uppercase text-secondary">
          Monitor de Sobrevivência
        </Text>
        <Text
          accessibilityRole="header"
          className="font-hanken-bold text-display-lg text-on-surface"
        >
          Suas contas
        </Text>
      </View>

      <View className="flex-row items-center gap-stack-md">
        <HideValuesToggle hidden={hidden} onToggleHidden={onToggleHidden} />

        <Pressable
          onPress={onCreateAccount}
          accessibilityRole="button"
          accessibilityLabel="Nova conta"
          className="flex-row items-center gap-stack-sm rounded-lg bg-surface-container-highest px-stack-md py-base"
        >
          <Icon name="add" size={16} color="#d0bcff" />
          <Text className="font-geist-semibold text-label-sm text-primary">NOVA CONTA</Text>
        </Pressable>
      </View>
    </View>
  );
}
