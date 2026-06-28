import { MobilePageHeader } from './MobilePageHeader';

// Título da tela de Contas no mobile. O balanço geral ("Patrimônio Líquido") foi
// removido de propósito: a tela mostra o saldo de cada conta + o cartão (Raio-X),
// sem total agregado. Fino wrapper sobre o MobilePageHeader pra seguir o padrão.
export function ContasHero() {
  return <MobilePageHeader eyebrow="Monitor de Sobrevivência" title="Suas contas" />;
}
