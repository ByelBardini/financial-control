import { View } from 'react-native';
import { CreditCardCard } from '../CreditCardCard';
import { PanelHeading } from './PanelHeading';
import { colors } from '../../theme/colors';
import type { CreditCard } from '../../types/contas';

type CartoesPanelProps = {
  cards: CreditCard[];
  hidden: boolean;
  onEditAccount?: (id: string) => void;
};

// Painel "Cartões" do desktop: título com ícone + contagem + cartões lado a lado
// (CreditCardCard é flex-1, então dividem a linha, como o ValesPanel).
export function CartoesPanel({ cards, hidden, onEditAccount }: CartoesPanelProps) {
  return (
    <View className="gap-stack-md p-stack-lg">
      <PanelHeading
        icon="credit_card"
        iconColor={colors.primary}
        title="Cartões"
        count={`${cards.length} ATIVOS`}
      />
      <View className="flex-row gap-stack-md">
        {cards.map((card) => (
          <View key={card.id} className="flex-1">
            <CreditCardCard
              card={card}
              hidden={hidden}
              onPress={onEditAccount ? () => onEditAccount(card.id) : undefined}
            />
          </View>
        ))}
      </View>
    </View>
  );
}
