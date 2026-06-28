import { Text, View } from 'react-native';
import { Button } from '../Button';
import { HideValuesToggle } from '../HideValuesToggle';
import { DesktopPageHeader } from './DesktopPageHeader';
import type { MenuAnchor } from '../transacoes/NewTransactionMenu';

type DesktopHeaderProps = {
  hidden: boolean;
  onToggleHidden: () => void;
  onCreate?: (anchor?: MenuAnchor) => void;
};

// Cabeçalho do Dashboard: compõe o DesktopPageHeader (eyebrow + título + subtítulo)
// com as ações à direita — pílula de mês, ocultar valores e "Nova transação". O CTA
// abre o mini menu via onCreate e se mede (measureAnchor) pra ancorar o popover abaixo dele.
export function DesktopHeader({ hidden, onToggleHidden, onCreate }: DesktopHeaderProps) {
  return (
    <DesktopPageHeader
      eyebrow="Visão Geral"
      title="Bem-vindo de volta"
      subtitle="à sua realidade financeira."
    >
      <View className="flex-row items-center gap-stack-sm rounded-full border border-outline-variant bg-surface-container-lowest px-stack-md py-base">
        <View className="h-2 w-2 rounded-full bg-secondary" />
        <Text className="font-geist-medium text-label-sm text-on-surface-variant">Junho 2026</Text>
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
