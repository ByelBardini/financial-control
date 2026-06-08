import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

type ArchiveAccountButtonProps = {
  onArchive: () => void;
  archiving?: boolean;
};

// Botão "Arquivar conta" com confirmação em dois passos (gatilho → Sim/Cancelar). Dono
// do próprio estado de confirmação; o AccountForm só passa onArchive/archiving e fica
// responsável só pelos campos de criar/editar.
export function ArchiveAccountButton({ onArchive, archiving = false }: ArchiveAccountButtonProps) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Pressable
        onPress={() => setConfirming(true)}
        accessibilityRole="button"
        accessibilityLabel="Arquivar conta"
        className="min-h-11 items-center justify-center"
      >
        <Text className="font-geist-semibold text-label-md text-error">Arquivar conta</Text>
      </Pressable>
    );
  }
  return (
    <View className="gap-stack-sm">
      <Text className="font-geist-medium text-label-sm text-on-surface-variant">
        Arquivar esta conta? Ela some das telas.
      </Text>
      <View className="flex-row gap-stack-md">
        <Pressable
          onPress={onArchive}
          disabled={archiving}
          accessibilityRole="button"
          accessibilityLabel="Confirmar arquivamento"
          className="min-h-11 flex-1 items-center justify-center rounded-lg bg-error px-gutter"
        >
          <Text className="font-geist-semibold text-label-md text-background">Sim, arquivar</Text>
        </Pressable>
        <Pressable
          onPress={() => setConfirming(false)}
          accessibilityRole="button"
          accessibilityLabel="Cancelar arquivamento"
          className="min-h-11 flex-1 items-center justify-center rounded-lg border border-outline-variant px-gutter"
        >
          <Text className="font-geist-medium text-label-md text-on-surface-variant">Cancelar</Text>
        </Pressable>
      </View>
    </View>
  );
}
