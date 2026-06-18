import { useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { HideValuesToggle } from '../HideValuesToggle';
import { Icon } from '../Icon';
import { TransactionSearch } from '../TransactionSearch';
import type { MenuAnchor } from '../transacoes/NewTransactionMenu';

type TransacoesHeaderProps = {
  hidden: boolean;
  onToggleHidden: () => void;
  searchText: string;
  onSearchChange: (text: string) => void;
  onCreate?: (anchor?: MenuAnchor) => void;
};

// Cabeçalho da página de Transações no desktop: título + subtítulo à esquerda; busca
// (funcional, debounçada na tela), switch de ocultar valores e "Nova transação" (abre o mini
// menu de criação via onCreate) à direita. O botão se mede (measureInWindow) e manda o retângulo
// pro menu sair logo abaixo dele — abre na hora e reposiciona quando a medida chega (test-safe).
export function TransacoesHeader({
  hidden,
  onToggleHidden,
  searchText,
  onSearchChange,
  onCreate,
}: TransacoesHeaderProps) {
  const buttonRef = useRef<View>(null);

  const handleCreate = () => {
    if (!onCreate) return;
    onCreate(); // abre já (sem âncora → fallback)
    buttonRef.current?.measureInWindow?.((x, y, width, height) =>
      onCreate({ x, y, width, height }),
    );
  };

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
          ref={buttonRef}
          onPress={handleCreate}
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
