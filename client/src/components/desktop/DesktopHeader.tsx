import { useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { HideValuesToggle } from '../HideValuesToggle';
import { Icon } from '../Icon';
import type { MenuAnchor } from '../transacoes/NewTransactionMenu';

type DesktopHeaderProps = {
  hidden: boolean;
  onToggleHidden: () => void;
  onCreate?: (anchor?: MenuAnchor) => void;
};

// Cabeçalho do desktop: título + pílulas de mês/ocultar valores + ação primária. "Nova transação"
// abre o mini menu de criação via onCreate; o botão se mede (measureInWindow) e manda o retângulo
// pro menu sair logo abaixo dele — abre na hora e reposiciona quando a medida chega (test-safe).
export function DesktopHeader({ hidden, onToggleHidden, onCreate }: DesktopHeaderProps) {
  const buttonRef = useRef<View>(null);

  const handleCreate = () => {
    if (!onCreate) return;
    onCreate(); // abre já (sem âncora → fallback)
    buttonRef.current?.measureInWindow?.((x, y, width, height) =>
      onCreate({ x, y, width, height }),
    );
  };

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

        <Pressable
          ref={buttonRef}
          onPress={handleCreate}
          accessibilityRole="button"
          accessibilityLabel="Nova transação"
          className="flex-row items-center gap-stack-sm rounded-lg bg-surface-container-highest px-stack-md py-base"
        >
          <Icon name="add" size={16} color="#d0bcff" />
          <Text className="font-geist-semibold text-label-sm text-primary">Nova transação</Text>
        </Pressable>
      </View>
    </View>
  );
}
