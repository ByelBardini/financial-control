import { View } from 'react-native';
import { InvestmentRow } from './InvestmentRow';
import { SectionHeading } from './SectionHeading';
import type { Investment } from '../types/dashboard';

type InvestmentsSectionProps = {
  investments: Investment[];
  hidden: boolean;
};

export function InvestmentsSection({ investments, hidden }: InvestmentsSectionProps) {
  return (
    <View className="gap-stack-sm border-b border-outline-variant px-container-margin pb-stack-lg">
      <SectionHeading>Investimentos (Risos)</SectionHeading>
      {investments.map((investment) => (
        <InvestmentRow key={investment.id} investment={investment} hidden={hidden} />
      ))}
    </View>
  );
}
