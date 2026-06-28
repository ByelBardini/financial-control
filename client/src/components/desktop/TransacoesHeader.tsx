import { View } from 'react-native';
import { Button } from '../Button';
import { HideValuesToggle } from '../HideValuesToggle';
import { TransactionSearch } from '../TransactionSearch';
import { DesktopPageHeader } from './DesktopPageHeader';
import type { MenuAnchor } from '../transacoes/NewTransactionMenu';

type TransacoesHeaderProps = {
  hidden: boolean;
  onToggleHidden: () => void;
  searchText: string;
  onSearchChange: (text: string) => void;
  onCreate?: (anchor?: MenuAnchor) => void;
};

// Cabeçalho da página de Transações: compõe o DesktopPageHeader com busca (funcional,
// debounçada na tela), ocultar valores e "Nova transação" à direita. O CTA abre o mini
// menu via onCreate e se mede (measureAnchor) pra ancorar o popover abaixo dele.
export function TransacoesHeader({
  hidden,
  onToggleHidden,
  searchText,
  onSearchChange,
  onCreate,
}: TransacoesHeaderProps) {
  return (
    <DesktopPageHeader
      eyebrow="Terminal Financeiro"
      title="Transações"
      subtitle="Rastreando cada centavo em fuga."
    >
      <View className="w-48">
        <TransactionSearch value={searchText} onChange={onSearchChange} compact />
      </View>

      <HideValuesToggle hidden={hidden} onToggleHidden={onToggleHidden} />

      <Button
        label="Nova transação"
        iconName="add"
        measureAnchor
        onPress={(anchor) => onCreate?.(anchor)}
      />
    </DesktopPageHeader>
  );
}
