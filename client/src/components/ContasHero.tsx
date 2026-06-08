import { Text, View } from 'react-native';

// Título da tela de Contas no mobile. O balanço geral ("Patrimônio Líquido") foi
// removido de propósito: a tela mostra o saldo de cada conta + o cartão (Raio-X),
// sem total agregado — esse não é o foco da tela.
export function ContasHero() {
  return (
    <View className="gap-base px-container-margin">
      <Text className="font-geist-medium text-label-sm uppercase text-on-surface-variant">
        Monitor de Sobrevivência
      </Text>
      <Text
        accessibilityRole="header"
        className="font-hanken-bold text-headline-md text-on-surface"
      >
        Suas contas
      </Text>
    </View>
  );
}
