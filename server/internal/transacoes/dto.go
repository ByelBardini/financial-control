// Package transacoes serve as views da tela de Transações (fluxo de caixa, log,
// recorrências, dívidas) e o CRUD de transação. Mesmas camadas dos demais domínios:
// handler → service (agrega/deriva) → store (pgx/sqlc). Tudo escopado por user_id (do
// token). Dinheiro em centavos (int64); DTOs com tags json 1:1 com client/src/types/transacoes.ts.
package transacoes

// Transaction é uma linha do log de transações (presentação — labels/tag — derivada no service).
type Transaction struct {
	ID           string `json:"id"`
	DateLabel    string `json:"dateLabel"`
	TimeLabel    string `json:"timeLabel"`
	Title        string `json:"title"`
	AccountLabel string `json:"accountLabel"`
	Category     string `json:"category"`
	Tag          string `json:"tag"`
	TagTone      string `json:"tagTone"`
	AmountCents  int64  `json:"amountCents"`
	Direction    string `json:"direction"`
	Icon         string `json:"icon"`
}

// PanicMeter é o medidor (posição 0..100 + rótulos). Mesma forma da de contas, mas
// local ao domínio — domínios não compartilham DTO.
type PanicMeter struct {
	Percent    int    `json:"percent"`
	LevelLabel string `json:"levelLabel"`
	LevelTone  string `json:"levelTone"`
	LowLabel   string `json:"lowLabel"`
	HighLabel  string `json:"highLabel"`
	Note       string `json:"note"`
}

// CashflowSummary é o resumo de fluxo de caixa do mês + a "Previsão de Colapso".
type CashflowSummary struct {
	InflowCents  int64      `json:"inflowCents"`
	OutflowCents int64      `json:"outflowCents"`
	NetBurnCents int64      `json:"netBurnCents"`
	BurnPercent  int        `json:"burnPercent"`
	Collapse     PanicMeter `json:"collapse"`
}

// Recurrence é uma receita/despesa recorrente (de recurring_rules).
type Recurrence struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Category    string `json:"category"`
	AmountCents int64  `json:"amountCents"`
	Direction   string `json:"direction"`
	Icon        string `json:"icon"`
}

// FutureDebt é uma compra parcelada agregada (progresso + valor da parcela + ironia).
type FutureDebt struct {
	ID               string `json:"id"`
	Label            string `json:"label"`
	InstallmentLabel string `json:"installmentLabel"`
	AmountCents      int64  `json:"amountCents"`
	Percent          int    `json:"percent"`
	Tone             string `json:"tone"`
	Icon             string `json:"icon"`
	Note             string `json:"note"`
}
