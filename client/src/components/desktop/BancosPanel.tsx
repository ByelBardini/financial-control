import { View } from 'react-native';
import { BankAccountRow } from './BankAccountRow';
import { PanelHeading } from './PanelHeading';
import { colors } from '../../theme/colors';
import type { BankAccount } from '../../types/contas';

type BancosPanelProps = {
  accounts: BankAccount[];
  hidden: boolean;
  onTransferFrom?: (id: string) => void;
  onEditAccount?: (id: string) => void;
};

// Painel "Bancos" do desktop: título com ícone + contagem de contas + lista de linhas.
export function BancosPanel({ accounts, hidden, onTransferFrom, onEditAccount }: BancosPanelProps) {
  return (
    <View className="gap-stack-md p-stack-lg">
      <PanelHeading
        icon="account_balance"
        iconColor={colors.secondary}
        title="Bancos"
        count={`${accounts.length} CONECTADOS`}
      />
      <View>
        {accounts.map((account) => (
          <BankAccountRow
            key={account.id}
            account={account}
            hidden={hidden}
            onPress={onTransferFrom ? () => onTransferFrom(account.id) : undefined}
            onEdit={onEditAccount ? () => onEditAccount(account.id) : undefined}
          />
        ))}
      </View>
    </View>
  );
}
