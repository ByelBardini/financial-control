// Package patrimonio monta a visão "quanto eu tenho hoje": o saldo líquido (bancos +
// espécie) + os blocos À PARTE (investimentos, cripto, dívida de cartão, vales). É a fonte
// única consumida pela Início e pela tela de Contas, pra os dois mostrarem o mesmo número.
// json tags 1:1 com client/src/types/patrimonio.ts; valores sempre em centavos (inteiro).
package patrimonio

// Overview é a quebra do patrimônio do usuário. O líquido (o saldo "quanto eu tenho hoje")
// é bankCents + cashCents; os demais campos ficam À PARTE — não entram no líquido.
type Overview struct {
	LiquidBalanceCents int64 `json:"liquidBalanceCents"`
	BankCents          int64 `json:"bankCents"`
	CashCents          int64 `json:"cashCents"`
	InvestedCents      int64 `json:"investedCents"`
	CryptoCents        int64 `json:"cryptoCents"`
	CardDebtCents      int64 `json:"cardDebtCents"`
	VoucherCents       int64 `json:"voucherCents"`
}
