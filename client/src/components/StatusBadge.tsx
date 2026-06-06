import { Text, View } from 'react-native';

type StatusBadgeProps = { label: string };

// Pílula de status do saldo ("Sobrevivendo"): texto escuro sobre verde-limão.
export function StatusBadge({ label }: StatusBadgeProps) {
  return (
    <View className="self-start rounded-full bg-secondary px-stack-md py-stack-sm">
      <Text className="font-geist-semibold text-label-sm uppercase text-background">{label}</Text>
    </View>
  );
}
