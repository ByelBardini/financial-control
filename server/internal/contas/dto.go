// Package contas serve as views agregadas da tela de Contas (bancos, cartões, vales,
// carteira), o "Raio-X de Pobreza" e a dica. Mesmas camadas dos demais domínios:
// handler → service (agrega/deriva) → store (pgx/sqlc). Tudo escopado por user_id
// (do token). Dinheiro em centavos (int64).
package contas

// DTOs com tags json 1:1 com client/src/types/contas.ts.

// BankAccount é uma conta da seção "Bancos".
type BankAccount struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Subtitle     string `json:"subtitle"`
	BalanceCents int64  `json:"balanceCents"`
	Icon         string `json:"icon"`
	BrandColor   string `json:"brandColor"`
	Note         string `json:"note"`
	NoteTone     string `json:"noteTone"`
}

// Voucher é um vale (benefício) da seção "Vales".
type Voucher struct {
	ID               string `json:"id"`
	Name             string `json:"name"`
	ValueCents       int64  `json:"valueCents"`
	Icon             string `json:"icon"`
	Status           string `json:"status"`
	RemainingPercent int    `json:"remainingPercent"`
	Note             string `json:"note"`
	NoteTone         string `json:"noteTone"`
}

// CreditCard é um cartão da seção "Cartões": fatura atual (dívida), limite, quanto
// sobra e o % usado, com apresentação (icon/brandColor) e ironia derivada.
type CreditCard struct {
	ID             string `json:"id"`
	Name           string `json:"name"`
	InvoiceCents   int64  `json:"invoiceCents"`
	LimitCents     int64  `json:"limitCents"`
	AvailableCents int64  `json:"availableCents"`
	UsedPercent    int    `json:"usedPercent"`
	Icon           string `json:"icon"`
	BrandColor     string `json:"brandColor"`
	Note           string `json:"note"`
	NoteTone       string `json:"noteTone"`
}

// CashWallet é a "Carteira Física" (dinheiro em espécie) + medidor de confiança.
type CashWallet struct {
	BalanceCents      int64  `json:"balanceCents"`
	Quip              string `json:"quip"`
	ConfidenceLabel   string `json:"confidenceLabel"`
	ConfidencePercent int    `json:"confidencePercent"`
}

// XrayRow é uma linha monetária do "Raio-X de Pobreza".
type XrayRow struct {
	Label string `json:"label"`
	Cents int64  `json:"cents"`
	Tone  string `json:"tone"`
}

// PanicMeter é o medidor de pânico (posição 0..100 + rótulos).
type PanicMeter struct {
	Percent    int    `json:"percent"`
	LevelLabel string `json:"levelLabel"`
	LevelTone  string `json:"levelTone"`
	LowLabel   string `json:"lowLabel"`
	HighLabel  string `json:"highLabel"`
	Note       string `json:"note"`
}

// PovertyXray é o cartão "Raio-X de Pobreza": linhas (dívida/limite) + Panic Meter.
type PovertyXray struct {
	Title string     `json:"title"`
	Rows  []XrayRow  `json:"rows"`
	Panic PanicMeter `json:"panic"`
}

// ManagementTip é o cartão "Dica de Gestão".
type ManagementTip struct {
	Title string `json:"title"`
	Body  string `json:"body"`
}
