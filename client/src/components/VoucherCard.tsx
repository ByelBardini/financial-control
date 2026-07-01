import { Pressable, Text, View } from 'react-native';
import { Card } from './Card';
import { AccountGear } from './contas/AccountGear';
import { Icon } from './Icon';
import { MoneyText } from './MoneyText';
import { ProgressBar } from './ProgressBar';
import { VoucherStatusBadge } from './VoucherStatusBadge';
import { colors, toneColor } from '../theme/colors';
import type { Voucher, VoucherStatus } from '../types/contas';
import type { Tone } from '../types/dashboard';

type VoucherCardProps = {
  voucher: Voucher;
  hidden: boolean;
  onPress?: () => void; // tocar no card abre Transferir com este vale como origem
  onEdit?: () => void; // engrenagem → editar/arquivar
};

// Tom da barra de consumo por status do vale.
const statusTone: Record<VoucherStatus, Tone> = {
  ativo: 'secondary',
  estavel: 'neutral',
  critico: 'error',
};

// Cartão de vale (benefício): ícone + status, valor, barra de consumo e nota ácida. O corpo é um
// alvo "Transferir de {vale}"; a engrenagem (irmã, absoluta no canto) abre a edição.
export function VoucherCard({ voucher, hidden, onPress, onEdit }: VoucherCardProps) {
  const body = (
    <>
      <View className="flex-row items-start justify-between pr-9">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-container-high">
          <Icon name={voucher.icon} size={20} color={colors.onSurfaceVariant} />
        </View>
        <VoucherStatusBadge status={voucher.status} />
      </View>
      <Text className="font-geist-semibold text-label-md text-on-surface">{voucher.name}</Text>
      <MoneyText
        cents={voucher.valueCents}
        hidden={hidden}
        tone="neutral"
        className="font-hanken-semibold text-headline-sm"
      />
      <ProgressBar percent={voucher.remainingPercent} tone={statusTone[voucher.status]} />
      <Text
        className="font-geist-medium text-label-sm"
        style={{ color: toneColor(voucher.noteTone) }}
      >
        {voucher.note}
      </Text>
    </>
  );

  return (
    <Card variant="outlined" className="bg-surface-container-low p-stack-lg">
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole="button"
        accessibilityLabel={`Transferir de ${voucher.name}`}
        className="gap-stack-md"
      >
        {body}
      </Pressable>
      {onEdit ? (
        <View className="absolute right-3 top-3">
          <AccountGear name={voucher.name} onEdit={onEdit} />
        </View>
      ) : null}
    </Card>
  );
}
