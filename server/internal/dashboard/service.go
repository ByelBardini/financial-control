package dashboard

import (
	"context"
	"fmt"
	"math"
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
	ListPositions(ctx context.Context, userID string, includeCrypto, onlyCrypto bool) ([]store.PositionRow, error)
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

// MonthBalance devolve o resumo do mês que contém month, do usuário. investidoCents é o valor
// atual da carteira (derivado das posições — não mais stub).
func (s *Service) MonthBalance(ctx context.Context, userID string, month time.Time) (MonthBalance, error) {
	sum, err := s.store.GetMonthSummary(ctx, userID, month)
	if err != nil {
		return MonthBalance{}, fmt.Errorf("dashboard: resumo do mês: %w", err)
	}
	positions, err := s.store.ListPositions(ctx, userID, true, false)
	if err != nil {
		return MonthBalance{}, fmt.Errorf("dashboard: investido do mês: %w", err)
	}
	label, quip := statusFor(pct.Round(sum.GastosCents, sum.ReceitasCents))
	return MonthBalance{
		NetCents:       sum.ReceitasCents - sum.GastosCents,
		AvailableLabel: availableLabel,
		StatusLabel:    label,
		Quip:           quip,
		ReceitasCents:  sum.ReceitasCents,
		GastosCents:    sum.GastosCents,
		InvestidoCents: investedTotal(positions),
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

// Investments lista os ativos da carteira do usuário (posições abertas, carteira inteira) pro bloco
// "Investimentos" da Início. Derivado das operações — DailyChangePct carrega o ganho% acumulado
// (não há cotação diária confiável; ver investimentos.md).
func (s *Service) Investments(ctx context.Context, userID string) ([]Investment, error) {
	rows, err := s.store.ListPositions(ctx, userID, true, false)
	if err != nil {
		return nil, fmt.Errorf("dashboard: investimentos: %w", err)
	}
	out := make([]Investment, 0, len(rows))
	for _, r := range rows {
		if !isOpenRow(r) {
			continue
		}
		gain := r.CurrentValueCents - r.CostBasisCents
		out = append(out, Investment{
			ID:             r.ID,
			Name:           r.Ticker,
			ValueCents:     r.CurrentValueCents,
			DailyChangePct: changePct(gain, r.CostBasisCents),
			Icon:           r.Icon,
		})
	}
	return out, nil
}

// InvestmentsSummary resume a carteira do usuário (valor atual, ganho/perda e %) pro painel da Início.
func (s *Service) InvestmentsSummary(ctx context.Context, userID string) (InvestmentsSummary, error) {
	rows, err := s.store.ListPositions(ctx, userID, true, false)
	if err != nil {
		return InvestmentsSummary{}, fmt.Errorf("dashboard: resumo dos investimentos: %w", err)
	}
	var total, cost int64
	for _, r := range rows {
		if !isOpenRow(r) {
			continue
		}
		total += r.CurrentValueCents
		cost += r.CostBasisCents
	}
	gain := total - cost
	return InvestmentsSummary{TotalCents: total, ChangeCents: gain, ChangePct: changePct(gain, cost)}, nil
}

// zeroQuantity é a quantidade líquida (string, 8 casas) de uma posição totalmente vendida.
const zeroQuantity = "0.00000000"

// isOpenRow diz se a posição ainda tem quantidade (não foi zerada).
func isOpenRow(r store.PositionRow) bool { return r.NetQuantity != zeroQuantity }

// investedTotal soma o valor atual das posições abertas (patrimônio investido).
func investedTotal(rows []store.PositionRow) int64 {
	var total int64
	for _, r := range rows {
		if isOpenRow(r) {
			total += r.CurrentValueCents
		}
	}
	return total
}

// changePct é o ganho/perda em % (2 casas), guardando contra custo zero. Só display.
func changePct(gainCents, costCents int64) float64 {
	if costCents == 0 {
		return 0
	}
	return math.Round(float64(gainCents)/float64(costCents)*10000) / 100
}

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
