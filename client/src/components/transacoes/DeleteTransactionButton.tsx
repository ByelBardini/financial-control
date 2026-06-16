import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

type DeleteTransactionButtonProps = {
  onDelete: () => void;
  deleting?: boolean;
};

// Botão "Excluir transação" com confirmação em dois passos (gatilho → Sim/Cancelar).
// Hard delete (o saldo se recalcula sem ela). Espelha o ArchiveAccountButton.
export function DeleteTransactionButton({
  onDelete,
  deleting = false,
}: DeleteTransactionButtonProps) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Pressable
        onPress={() => setConfirming(true)}
        accessibilityRole="button"
        accessibilityLabel="Excluir transação"
        className="min-h-11 items-center justify-center"
      >
        <Text className="font-geist-semibold text-label-md text-error">Excluir transação</Text>
      </Pressable>
    );
  }
  return (
    <View className="gap-stack-sm">
      <Text className="font-geist-medium text-label-sm text-on-surface-variant">
        Excluir esta transação? Não dá pra desfazer.
      </Text>
      <View className="flex-row gap-stack-md">
        <Pressable
          onPress={onDelete}
          disabled={deleting}
          accessibilityRole="button"
          accessibilityLabel="Confirmar exclusão"
          className="min-h-11 flex-1 items-center justify-center rounded-lg bg-error px-gutter"
        >
          <Text className="font-geist-semibold text-label-md text-background">Sim, excluir</Text>
        </Pressable>
        <Pressable
          onPress={() => setConfirming(false)}
          accessibilityRole="button"
          accessibilityLabel="Cancelar exclusão"
          className="min-h-11 flex-1 items-center justify-center rounded-lg border border-outline-variant px-gutter"
        >
          <Text className="font-geist-medium text-label-md text-on-surface-variant">Cancelar</Text>
        </Pressable>
      </View>
    </View>
  );
}
