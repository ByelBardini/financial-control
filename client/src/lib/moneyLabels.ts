// Rótulos monetários canônicos — fonte única das strings exibidas para dinheiro
// em todas as telas. Centralizar aqui evita o drift que confundia o usuário (a
// mesma coisa escrita diferente em telas diferentes). Ver design-system.md.

// Estoque ("quanto eu tenho hoje"): líquido = bancos + espécie. Investimentos,
// cripto, cartão e vales ficam À PARTE — não entram no líquido.
export const LIQUID_BALANCE = 'Saldo líquido';
export const BANK_SUBTOTAL = 'Em bancos';
export const CASH_SUBTOTAL = 'Em espécie';
export const ASSETS_TOTAL = 'Patrimônio em ativos';
export const CRYPTO_SUBTOTAL = 'Subtotal em cripto';
export const CARD_DEBT = 'Fatura no cartão';
export const VOUCHERS = 'Vales';

// Fluxo (o que entrou/saiu no mês) — sempre rotulado "do mês" pra não confundir
// com o estoque acima (era o que fazia "Saldo do Mês" parecer "quanto eu tenho").
export const MONTH_INCOME = 'Receitas do mês';
export const MONTH_EXPENSE = 'Gastos do mês';
export const MONTH_RESULT = 'Resultado do mês';
