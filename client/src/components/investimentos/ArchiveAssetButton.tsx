import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

type ArchiveAssetButtonProps = {
  onArchive: () => void;
  archiving?: boolean;
};

// Botão "Arquivar ativo" com confirmação em dois passos (gatilho → Sim/Cancelar), igual ao
// ArchiveAccountButton. Arquivar (soft-delete) tira o ativo das telas; é dono do próprio estado
// de confirmação, então o AssetForm só passa onArchive/archiving.
export function ArchiveAssetButton({ onArchive, archiving = false }: ArchiveAssetButtonProps) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Pressable
        onPress={() => setConfirming(true)}
        accessibilityRole="button"
        accessibilityLabel="Arquivar ativo"
        className="min-h-11 items-center justify-center"
      >
        <Text className="font-geist-semibold text-label-md text-error">Arquivar ativo</Text>
      </Pressable>
    );
  }
  return (
    <View className="gap-stack-sm">
      <Text className="font-geist-medium text-label-sm text-on-surface-variant">
        Arquivar este ativo? Ele some das telas.
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
