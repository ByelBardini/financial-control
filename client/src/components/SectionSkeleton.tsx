import { View } from 'react-native';

// Placeholder de carregamento de uma seção (loading por seção). Sem lógica —
// só um bloco neutro com a margem das seções, anunciado como "Carregando".
export function SectionSkeleton() {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Carregando"
      className="px-container-margin pb-stack-lg"
    >
      <View className="h-24 rounded-xl bg-surface-container" />
    </View>
  );
}
