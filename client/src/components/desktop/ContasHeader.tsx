import { Button } from '../Button';
import { HideValuesToggle } from '../HideValuesToggle';
import { DesktopPageHeader } from './DesktopPageHeader';

type ContasHeaderProps = {
  hidden: boolean;
  onToggleHidden: () => void;
  onCreateAccount?: () => void;
};

// Cabeçalho da página de Contas: compõe o DesktopPageHeader (eyebrow + título) com
// ocultar valores + "Nova conta" à direita. Sem balanço agregado ("Patrimônio
// Líquido") — a tela foca no saldo de cada conta + o cartão (Raio-X), não num total.
export function ContasHeader({ hidden, onToggleHidden, onCreateAccount }: ContasHeaderProps) {
  return (
    <DesktopPageHeader eyebrow="Monitor de Sobrevivência" title="Suas contas">
      <HideValuesToggle hidden={hidden} onToggleHidden={onToggleHidden} />
      <Button label="Nova conta" iconName="add" onPress={() => onCreateAccount?.()} />
    </DesktopPageHeader>
  );
}
