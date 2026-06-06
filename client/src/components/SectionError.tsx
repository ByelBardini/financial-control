import { Pressable, Text, View } from 'react-native';

type SectionErrorProps = {
  label?: string; // contexto da seção (ex.: "contas") para a mensagem
  onRetry?: () => void;
};

// Erro isolado de uma seção (erro por seção): mensagem curta + "Tentar de novo".
// Uma seção falhar não derruba o resto do dashboard.
export function SectionError({ label, onRetry }: SectionErrorProps) {
  const message = label
    ? `Não foi possível carregar ${label}.`
    : 'Não foi possível carregar esta seção.';

  return (
    <View className="gap-stack-md px-container-margin pb-stack-lg">
      <Text className="font-hanken text-body-md text-error">{message}</Text>
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tentar de novo"
          onPress={() => onRetry()}
          className="self-start rounded-lg bg-surface-container-high px-gutter py-base"
        >
          <Text className="font-geist-medium text-label-md text-on-surface">Tentar de novo</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
