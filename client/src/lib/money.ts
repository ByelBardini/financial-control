const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const inputBRL = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Máscara exibida no lugar do valor quando ele está oculto (toggle "Ocultar valores").
// Fonte única — reusada pelo MoneyText e pelos cards que montam o texto monetário à mão
// (ex.: CreditCardCard junta "disponível de total" numa frase só).
export const MONEY_MASK = 'R$ ••••';

// Formata centavos (inteiro) como BRL. A divisão por 100 é a borda de exibição
// (nunca aritmética de domínio — ver docs/context/money.md). Normaliza o espaço
// do Intl (NBSP   / narrow-NBSP  ) para espaço comum: saída idêntica entre
// Hermes, web e Node. Ex.: formatBRL(4250) === "R$ 42,50".
export function formatBRL(cents: number): string {
  return brl.format(cents / 100).replace(/[  ]/g, ' ');
}

// formatCentsInput formata centavos (inteiro) para o campo monetário com máscara
// de centavos: "1.234,56" — sem "R$", que é prefixo fixo do MoneyField. Vazio
// quando 0, pra o placeholder aparecer. Ex.: formatCentsInput(1) === "0,01".
export function formatCentsInput(cents: number): string {
  if (!cents) return '';
  return inputBRL.format(cents / 100);
}

// digitsToCents lê o texto digitado como centavos, acumulando da direita pra a
// esquerda (cada dígito empurra os anteriores uma casa): "1"->1, "10"->10, "100"->100.
// Ignora tudo que não é dígito; o cap de 15 dígitos evita estourar o Number.
// Ex.: digitsToCents("1.234,56") === 123456, digitsToCents("") === 0.
export function digitsToCents(text: string): number {
  const digits = text.replace(/\D/g, '').slice(0, 15);
  return digits ? parseInt(digits, 10) : 0;
}
