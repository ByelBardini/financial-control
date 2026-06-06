// Package dashboard monta as visões do dashboard a partir do store, no formato
// que o client espera: valores em centavos e json tags 1:1 com
// client/src/types/dashboard.ts.
package dashboard

// MonthBalance é o resumo do mês (campo balance do DashboardSnapshot).
type MonthBalance struct {
	NetCents       int64  `json:"netCents"`
	AvailableLabel string `json:"availableLabel"`
	StatusLabel    string `json:"statusLabel"`
	Quip           string `json:"quip"`
	ReceitasCents  int64  `json:"receitasCents"`
	GastosCents    int64  `json:"gastosCents"`
	InvestidoCents int64  `json:"investidoCents"`
}

// CategorySpend é o gasto de uma categoria no mês, com o share em percent (0..100).
type CategorySpend struct {
	ID          string `json:"id"`
	Label       string `json:"label"`
	AmountCents int64  `json:"amountCents"`
	Percent     int    `json:"percent"`
	Tone        string `json:"tone"`
}

// EsteMes resume quanto da receita foi gasta e qual categoria pesou mais.
type EsteMes struct {
	SpentPercent   int    `json:"spentPercent"`
	BiggestVillain string `json:"biggestVillain"`
}

// Diagnosis é o cartão de diagnóstico (texto de personalidade derivado do net).
type Diagnosis struct {
	Title string `json:"title"`
	Body  string `json:"body"`
}

// Investment é um ativo investido. Deferido: ainda não há tabela (migration futura).
type Investment struct {
	ID             string  `json:"id"`
	Name           string  `json:"name"`
	ValueCents     int64   `json:"valueCents"`
	DailyChangePct float64 `json:"dailyChangePct"`
	Icon           string  `json:"icon"`
}

// InvestmentsSummary é o resumo da carteira de investimentos. Deferido (zerado).
type InvestmentsSummary struct {
	TotalCents  int64   `json:"totalCents"`
	ChangeCents int64   `json:"changeCents"`
	ChangePct   float64 `json:"changePct"`
}

// Ticker é a cotação destacada (cripto). Deferido: só rótulo estático, valores zerados.
type Ticker struct {
	Name          string  `json:"name"`
	Symbol        string  `json:"symbol"`
	ChangePct24h  float64 `json:"changePct24h"`
	PriceCents    int64   `json:"priceCents"`
	PositionCents int64   `json:"positionCents"`
}
