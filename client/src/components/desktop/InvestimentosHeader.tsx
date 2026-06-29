import { Button } from '../Button';
import { HideValuesToggle } from '../HideValuesToggle';
import { DesktopPageHeader } from './DesktopPageHeader';

type InvestimentosHeaderProps = {
  hidden: boolean;
  onToggleHidden: () => void;
  onCreateAsset?: () => void;
};

// Cabeçalho da página de Investimentos: compõe o DesktopPageHeader (eyebrow + título)
// com ocultar valores + "Novo ativo" à direita. CTA seco (abre o AssetFormModal direto,
// sem popover) — por isso não usa measureAnchor.
export function InvestimentosHeader({
  hidden,
  onToggleHidden,
  onCreateAsset,
}: InvestimentosHeaderProps) {
  return (
    <DesktopPageHeader eyebrow="Risco Máximo" title="Investimentos">
      <HideValuesToggle hidden={hidden} onToggleHidden={onToggleHidden} />
      <Button label="Novo ativo" iconName="add" onPress={() => onCreateAsset?.()} />
    </DesktopPageHeader>
  );
}
