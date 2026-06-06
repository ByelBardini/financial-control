import { View } from 'react-native';
import { AccountRow } from './AccountRow';
import { SectionHeading } from './SectionHeading';
import type { Account } from '../types/dashboard';

type AccountsSectionProps = {
  accounts: Account[];
  hidden: boolean;
};

export function AccountsSection({ accounts, hidden }: AccountsSectionProps) {
  return (
    <View className="gap-stack-sm border-b border-outline-variant px-container-margin pb-stack-lg">
      <SectionHeading>Contas</SectionHeading>
      {accounts.map((account) => (
        <AccountRow key={account.id} account={account} hidden={hidden} />
      ))}
    </View>
  );
}
