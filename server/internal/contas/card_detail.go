package contas

import (
	"context"
	"fmt"
	"time"

	"financial-control/server/internal/pct"
	"financial-control/server/internal/store"
)

// monthNames são os rótulos PT-BR dos meses (1-based via month-1) para a label da fatura.
var monthNames = [...]string{
	"Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
	"Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
}

// InvoiceEntry é um lançamento dentro de uma fatura mensal (centavos; sentido pro client).
type InvoiceEntry struct {
	ID          string `json:"id"`
	OccurredOn  string `json:"occurredOn"`
	Description string `json:"description"`
	Category    string `json:"category"`
	Icon        string `json:"icon"`
	Direction   string `json:"direction"`
	AmountCents int64  `json:"amountCents"`
	Kind        string `json:"kind"`
}

// InvoiceMonth é a fatura de um mês: total de compras (charges), de pagamentos (payments), o
// líquido devido (net = charges − payments) e os lançamentos. month é "YYYY-MM"; label "Junho/2026".
type InvoiceMonth struct {
	Month         string         `json:"month"`
	Label         string         `json:"label"`
	ChargesCents  int64          `json:"chargesCents"`
	PaymentsCents int64          `json:"paymentsCents"`
	NetCents      int64          `json:"netCents"`
	Entries       []InvoiceEntry `json:"entries"`
}

// CardDetail é a tela de detalhe de um cartão: cabeçalho (limite/fatura/disponível/% usado,
// derivados do saldo all-time como no creditCardView) + faturas por mês (mais recente primeiro).
type CardDetail struct {
	ID             string         `json:"id"`
	Name           string         `json:"name"`
	Icon           string         `json:"icon"`
	BrandColor     string         `json:"brandColor"`
	LimitCents     int64          `json:"limitCents"`
	InvoiceCents   int64          `json:"invoiceCents"`
	AvailableCents int64          `json:"availableCents"`
	UsedPercent    int            `json:"usedPercent"`
	Months         []InvoiceMonth `json:"months"`
}

// cardInvoice deriva fatura (saldo negativo, em positivo), disponível (limite − fatura, ≥ 0) e
// % usado (0..100). Fonte única da matemática do cartão — usada pelo creditCardView (lista) e
// pelo CardDetail (detalhe), pra os dois números baterem.
func cardInvoice(balanceCents, limitCents int64) (invoice, available int64, used int) {
	if balanceCents < 0 {
		invoice = -balanceCents
	}
	available = limitCents - invoice
	if available < 0 {
		available = 0
	}
	used = pct.Clamp(invoice, limitCents)
	return invoice, available, used
}

// CardDetail monta a tela de detalhe de um cartão: cabeçalho derivado do saldo all-time +
// faturas mensais (agrupadas dos lançamentos por mês de competência). store.ErrCardNotFound
// quando o cartão não é do usuário (handler responde 404).
func (s *Service) CardDetail(ctx context.Context, userID, cardID string) (CardDetail, error) {
	sum, err := s.store.GetCardSummary(ctx, userID, cardID)
	if err != nil {
		return CardDetail{}, fmt.Errorf("contas: resumo do cartão: %w", err)
	}
	entries, err := s.store.ListCardEntries(ctx, userID, cardID)
	if err != nil {
		return CardDetail{}, fmt.Errorf("contas: lançamentos do cartão: %w", err)
	}
	invoice, available, used := cardInvoice(sum.BalanceCents, sum.LimitCents)
	return CardDetail{
		ID:             sum.ID,
		Name:           sum.Name,
		Icon:           sum.Icon,
		BrandColor:     sum.DotColor,
		LimitCents:     sum.LimitCents,
		InvoiceCents:   invoice,
		AvailableCents: available,
		UsedPercent:    used,
		Months:         groupInvoiceMonths(entries),
	}, nil
}

// groupInvoiceMonths agrupa os lançamentos (já ordenados por data desc) em faturas mensais,
// preservando a ordem de aparição (meses do mais recente pro mais antigo).
func groupInvoiceMonths(entries []store.CardEntryRow) []InvoiceMonth {
	months := make([]InvoiceMonth, 0)
	idx := map[string]int{}
	for _, e := range entries {
		i, ok := idx[e.Month]
		if !ok {
			i = len(months)
			idx[e.Month] = i
			months = append(months, InvoiceMonth{Month: e.Month, Label: monthLabel(e.Month)})
		}
		if e.Direction == "expense" {
			months[i].ChargesCents += e.AmountCents
		} else {
			months[i].PaymentsCents += e.AmountCents
		}
		months[i].Entries = append(months[i].Entries, InvoiceEntry{
			ID:          e.ID,
			OccurredOn:  e.OccurredOn.Format("2006-01-02"),
			Description: e.Description,
			Category:    e.CategoryName,
			Icon:        e.CategoryIcon,
			Direction:   entryDirection(e.Direction),
			AmountCents: e.AmountCents,
			Kind:        e.Kind,
		})
	}
	for i := range months {
		months[i].NetCents = months[i].ChargesCents - months[i].PaymentsCents
	}
	return months
}

// monthLabel traduz "YYYY-MM" no rótulo PT-BR "Junho/2026". Formato inesperado → devolve o cru.
func monthLabel(month string) string {
	t, err := time.Parse("2006-01", month)
	if err != nil {
		return month
	}
	return fmt.Sprintf("%s/%d", monthNames[t.Month()-1], t.Year())
}

// entryDirection mapeia o sentido do banco (income/expense) pro do client (inflow/outflow).
func entryDirection(d string) string {
	if d == "income" {
		return "inflow"
	}
	return "outflow"
}
