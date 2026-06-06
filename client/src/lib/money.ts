const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// Formata centavos (inteiro) como BRL. A divisão por 100 é a borda de exibição
// (nunca aritmética de domínio — ver docs/context/money.md). Normaliza o espaço
// do Intl (NBSP / narrow-NBSP) para espaço comum: saída idêntica entre Hermes,
// web e Node. Ex.: formatBRL(4250) === "R$ 42,50".
export function formatBRL(cents: number): string {
  return brl.format(cents / 100).replace(/[  ]/g, ' ');
}
