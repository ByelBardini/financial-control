import { View } from 'react-native';
import { VoucherCard } from '../VoucherCard';
import { PanelHeading } from './PanelHeading';
import { colors } from '../../theme/colors';
import type { Voucher } from '../../types/contas';

type ValesPanelProps = {
  vouchers: Voucher[];
  hidden: boolean;
  onEditAccount?: (id: string) => void;
};

// Painel "Vales (Benefícios)" do desktop: título + cartões lado a lado (VoucherCard
// é flex-1, então dividem a linha).
export function ValesPanel({ vouchers, hidden, onEditAccount }: ValesPanelProps) {
  return (
    <View className="gap-stack-md p-stack-lg">
      <PanelHeading icon="fastfood" iconColor={colors.primary} title="Vales (Benefícios)" />
      <View className="flex-row gap-stack-md">
        {vouchers.map((voucher) => (
          <View key={voucher.id} className="flex-1">
            <VoucherCard
              voucher={voucher}
              hidden={hidden}
              onPress={onEditAccount ? () => onEditAccount(voucher.id) : undefined}
            />
          </View>
        ))}
      </View>
    </View>
  );
}
