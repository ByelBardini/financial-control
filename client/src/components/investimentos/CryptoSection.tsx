import { Text, View } from 'react-native';
import { CryptoCard } from './CryptoCard';
import { MoneyText } from '../MoneyText';
import { SectionHeading } from '../SectionHeading';
import type { CryptoBlock } from '../../types/investimentos';

type CryptoSectionProps = {
  crypto: CryptoBlock;
  hidden: boolean;
  onOpenHolding?: (id: string) => void;
};

// Bloco de cripto À PARTE do portfólio geral (não entra no total nem na alocação): título +
// subtítulo + subtotal próprio + um CryptoCard por holding. Componente único, reusado pelos
// dois layouts (mobile e desktop) pra não duplicar o cabeçalho.
export function CryptoSection({ crypto, hidden, onOpenHolding }: CryptoSectionProps) {
  return (
    <View className="gap-stack-md">
      <View className="gap-stack-sm">
        <SectionHeading>{crypto.title}</SectionHeading>
        <Text className="font-geist-medium text-label-sm text-on-surface-variant">
          {crypto.subtitle}
        </Text>
        <View className="flex-row items-center gap-stack-sm">
          <Text className="font-geist-medium text-label-sm uppercase text-on-surface-variant">
            Subtotal em cripto
          </Text>
          <MoneyText
            cents={crypto.subtotalCents}
            hidden={hidden}
            tone="neutral"
            className="font-hanken-semibold text-label-md"
          />
        </View>
      </View>
      {crypto.holdings.map((holding) => (
        <CryptoCard
          key={holding.id}
          holding={holding}
          hidden={hidden}
          onPress={onOpenHolding ? () => onOpenHolding(holding.id) : undefined}
        />
      ))}
    </View>
  );
}
