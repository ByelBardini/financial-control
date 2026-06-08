import { Text, View } from 'react-native';
import type { VoucherStatus } from '../types/contas';

type StatusStyle = { label: string; containerClass: string; textClass: string };

// Rótulo já em maiúsculo (texto literal) pra independer de text-transform, que o
// NativeWind não aplica nos testes.
const STATUS_STYLES: Record<VoucherStatus, StatusStyle> = {
  ativo: { label: 'ATIVO', containerClass: 'bg-secondary/10', textClass: 'text-secondary' },
  estavel: {
    label: 'ESTÁVEL',
    containerClass: 'bg-on-surface-variant/10',
    textClass: 'text-on-surface-variant',
  },
  critico: { label: 'CRÍTICO', containerClass: 'bg-error/10', textClass: 'text-error' },
};

// Pílula de status do vale: cor por estado (ativo→limão, estável→neutro, crítico→erro).
export function VoucherStatusBadge({ status }: { status: VoucherStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <View className={`self-start rounded ${style.containerClass} px-stack-sm py-stack-sm`}>
      <Text className={`font-geist-semibold text-label-sm ${style.textClass}`}>{style.label}</Text>
    </View>
  );
}
