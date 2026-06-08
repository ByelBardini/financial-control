import { Text, View } from 'react-native';
import { EditableCard } from './EditableCard';
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
  onPress?: () => void;
};

// Tom da barra de consumo por status do vale.
const statusTone: Record<VoucherStatus, Tone> = {
  ativo: 'secondary',
  estavel: 'neutral',
  critico: 'error',
};

const cardClass =
  'gap-stack-md rounded-xl border border-outline-variant bg-surface-container-low p-stack-lg';

// Cartão de vale (benefício): ícone + status, valor, barra de consumo e nota ácida.
// Com onPress, vira um alvo "Editar conta" acessível.
export function VoucherCard({ voucher, hidden, onPress }: VoucherCardProps) {
  const body = (
    <>
      <View className="flex-row items-start justify-between">
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
    <EditableCard className={cardClass} editLabel={`Editar ${voucher.name}`} onPress={onPress}>
      {body}
    </EditableCard>
  );
}
