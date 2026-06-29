import { MobilePageHeader } from './MobilePageHeader';

// Título da tela de Contas no mobile (eyebrow + título). O total geral voltou — agora a
// tela mostra o "Saldo líquido" (bancos + espécie) num LiquidBalanceHeader logo abaixo,
// como uma seção própria (gated pela query). Este wrapper segue só com o cabeçalho.
export function ContasHero() {
  return <MobilePageHeader eyebrow="Monitor de Sobrevivência" title="Suas contas" />;
}
