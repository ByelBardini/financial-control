package dashboard

import (
	"context"
	"fmt"
	"time"

	"financial-control/server/internal/pct"
	"financial-control/server/internal/store"
)

// availableLabel é o rótulo fixo do saldo disponível (igual ao contrato do client).
const availableLabel = "Disponível para gastar"

// diagnosisTitle é o título fixo do cartão de diagnóstico (igual ao contrato do client).
const diagnosisTitle = "Diagnóstico Pobrify"

// DashboardStore é a dependência de dados das visões do dashboard (escopada por usuário).
type DashboardStore interface {
	GetMonthSummary(ctx context.Context, userID string, month time.Time) (store.MonthSummaryRow, error)
	ListCategorySpend(ctx context.Context, userID string, month time.Time) ([]store.CategorySpendRow, error)
}

// Service monta as visões do dashboard a partir do store.
type Service struct {
	store DashboardStore
}

// NewService injeta o store.
//
//	svc := dashboard.NewService(st)
func NewService(s DashboardStore) *Service {
	return &Service{store: s}
}

// MonthBalance devolve o resumo do mês que contém month, do usuário.
func (s *Service) MonthBalance(ctx context.Context, userID string, month time.Time) (MonthBalance, error) {
	sum, err := s.store.GetMonthSummary(ctx, userID, month)
	if err != nil {
		return MonthBalance{}, fmt.Errorf("dashboard: resumo do mês: %w", err)
	}
	label, quip := statusFor(pct.Round(sum.GastosCents, sum.ReceitasCents))
	return MonthBalance{
		NetCents:       sum.ReceitasCents - sum.GastosCents,
		AvailableLabel: availableLabel,
		StatusLabel:    label,
		Quip:           quip,
		ReceitasCents:  sum.ReceitasCents,
		GastosCents:    sum.GastosCents,
		InvestidoCents: 0,
	}, nil
}

// Categories devolve o gasto por categoria do mês, com o share em percent, do usuário.
func (s *Service) Categories(ctx context.Context, userID string, month time.Time) ([]CategorySpend, error) {
	rows, err := s.store.ListCategorySpend(ctx, userID, month)
	if err != nil {
		return nil, fmt.Errorf("dashboard: categorias: %w", err)
	}
	var total int64
	for _, r := range rows {
		total += r.AmountCents
	}
	out := make([]CategorySpend, 0, len(rows))
	for _, r := range rows {
		out = append(out, CategorySpend{
			ID:          r.ID,
			Label:       r.Label,
			AmountCents: r.AmountCents,
			Percent:     pct.Round(r.AmountCents, total),
			Tone:        r.Tone,
		})
	}
	return out, nil
}

// EsteMes devolve quanto da receita foi gasta e a categoria que mais pesou, do usuário.
func (s *Service) EsteMes(ctx context.Context, userID string, month time.Time) (EsteMes, error) {
	sum, err := s.store.GetMonthSummary(ctx, userID, month)
	if err != nil {
		return EsteMes{}, fmt.Errorf("dashboard: este mês (resumo): %w", err)
	}
	cats, err := s.store.ListCategorySpend(ctx, userID, month)
	if err != nil {
		return EsteMes{}, fmt.Errorf("dashboard: este mês (categorias): %w", err)
	}
	villain := ""
	if len(cats) > 0 {
		villain = cats[0].Label // já vem ordenado por gasto desc
	}
	return EsteMes{
		SpentPercent:   pct.Round(sum.GastosCents, sum.ReceitasCents),
		BiggestVillain: villain,
	}, nil
}

// Diagnosis devolve o cartão de diagnóstico do mês (texto derivado do saldo líquido), do usuário.
func (s *Service) Diagnosis(ctx context.Context, userID string, month time.Time) (Diagnosis, error) {
	sum, err := s.store.GetMonthSummary(ctx, userID, month)
	if err != nil {
		return Diagnosis{}, fmt.Errorf("dashboard: diagnóstico: %w", err)
	}
	return Diagnosis{Title: diagnosisTitle, Body: diagnosisBody(sum.ReceitasCents - sum.GastosCents)}, nil
}

// Investments é um stub: a feature de investimentos ainda não tem tabela (migration futura).
// Devolve slice vazia (não nil) para o JSON virar [] e o contrato do client ficar honesto.
func (s *Service) Investments() []Investment { return []Investment{} }

// InvestmentsSummary é um stub deferido: resumo zerado até existir tabela de investimentos.
func (s *Service) InvestmentsSummary() InvestmentsSummary { return InvestmentsSummary{} }

// Ticker é um stub deferido: só o rótulo, valores zerados até integrar cotação externa.
func (s *Service) Ticker() Ticker { return Ticker{Name: "Bitcoin", Symbol: "B"} }

// diagnosisBody escolhe o texto do diagnóstico pelo sinal do saldo líquido.
// PLACEHOLDER: textos ajustáveis livremente.
func diagnosisBody(netCents int64) string {
	switch {
	case netCents > 0:
		return "Você ainda não está falido. Continue assim."
	case netCents == 0:
		return "Empate técnico com a falência. Respira."
	default:
		return "O vermelho bateu. Hora de cortar o delivery."
	}
}

// statusFor mapeia o percentual gasto da receita para a personalidade "Pobrify".
// PLACEHOLDER: limiares e textos são ajustáveis livremente — é pura função de spentPercent.
func statusFor(spentPercent int) (label, quip string) {
	switch {
	case spentPercent <= 0:
		return "No vácuo", "Sem dados, sem julgamento. Por ora."
	case spentPercent < 50:
		return "No controle", "Calma, ainda dá pra sonhar com férias."
	case spentPercent < 80:
		return "Sobrevivendo", "Vai dar pra pagar a Netflix. Talvez."
	case spentPercent < 100:
		return "No limite", "O mês tá mais magro que dia 30."
	default:
		return "No vermelho", "Parabéns, você gastou o que não tinha."
	}
}
