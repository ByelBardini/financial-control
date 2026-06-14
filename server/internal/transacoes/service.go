package transacoes

import (
	"context"
	"fmt"
	"time"

	"financial-control/server/internal/pct"
	"financial-control/server/internal/store"
)

// TransacoesStore é a dependência de dados das views de Transações (escopada por usuário).
// Reaproveita GetMonthSummary do store (já usado pelo dashboard) para o fluxo de caixa.
type TransacoesStore interface {
	GetMonthSummary(ctx context.Context, userID string, month time.Time) (store.MonthSummaryRow, error)
	ListRecentTransactions(ctx context.Context, userID string) ([]store.TransactionRow, error)
	ListRecurringRules(ctx context.Context, userID string) ([]store.RecurringRuleRow, error)
	ListInstallmentDebts(ctx context.Context, userID string) ([]store.InstallmentDebtRow, error)
	CreateTransaction(ctx context.Context, userID string, in store.TransactionInput) (string, error)
	GetTransactionByID(ctx context.Context, userID, id string) (store.TransactionDetailRow, error)
	UpdateTransaction(ctx context.Context, userID, id string, in store.TransactionInput) error
	DeleteTransaction(ctx context.Context, userID, id string) error
}

// Service agrega as views da tela de Transações: junta o dado real do store com a
// personalidade/formatação derivada. Sem estado além do store.
type Service struct {
	store TransacoesStore
}

// NewService injeta a dependência de dados.
//
//	svc := transacoes.NewService(st)
func NewService(s TransacoesStore) *Service {
	return &Service{store: s}
}

// CashflowSummary monta o resumo do mês (inflow/outflow/net + barra) e a Previsão de Colapso.
func (s *Service) CashflowSummary(ctx context.Context, userID string, month time.Time) (CashflowSummary, error) {
	sum, err := s.store.GetMonthSummary(ctx, userID, month)
	if err != nil {
		return CashflowSummary{}, fmt.Errorf("transacoes: resumo de fluxo: %w", err)
	}
	return CashflowSummary{
		InflowCents:  sum.ReceitasCents,
		OutflowCents: sum.GastosCents,
		NetBurnCents: sum.ReceitasCents - sum.GastosCents,
		BurnPercent:  pct.Clamp(sum.GastosCents, sum.ReceitasCents),
		Collapse:     collapseForecast(sum.ReceitasCents, sum.GastosCents),
	}, nil
}

// Transactions devolve o log recente com presentação derivada (data/tag/sentido/ícone).
func (s *Service) Transactions(ctx context.Context, userID string) ([]Transaction, error) {
	rows, err := s.store.ListRecentTransactions(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("transacoes: listar transações: %w", err)
	}
	out := make([]Transaction, 0, len(rows))
	for _, r := range rows {
		tag, tone := transactionTag(r.Direction)
		out = append(out, Transaction{
			ID:           r.ID,
			DateLabel:    dateLabel(r.OccurredOn),
			TimeLabel:    timeLabel(r.OccurredOn),
			Title:        r.Description,
			AccountLabel: r.AccountName,
			Category:     r.CategoryName,
			Tag:          tag,
			TagTone:      tone,
			AmountCents:  r.AmountCents,
			Direction:    directionView(r.Direction),
			Icon:         r.CategoryIcon,
		})
	}
	return out, nil
}

// Recurrences devolve as recorrências ativas (sentido mapeado pro client).
func (s *Service) Recurrences(ctx context.Context, userID string) ([]Recurrence, error) {
	rows, err := s.store.ListRecurringRules(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("transacoes: listar recorrências: %w", err)
	}
	out := make([]Recurrence, 0, len(rows))
	for _, r := range rows {
		out = append(out, Recurrence{
			ID:          r.ID,
			Name:        r.Description,
			Category:    r.CategoryName,
			AmountCents: r.AmountCents,
			Direction:   directionView(r.Direction),
			Icon:        r.CategoryIcon,
		})
	}
	return out, nil
}

// FutureDebts devolve as compras parceladas com progresso (parcelas lançadas/total) + ironia.
func (s *Service) FutureDebts(ctx context.Context, userID string) ([]FutureDebt, error) {
	rows, err := s.store.ListInstallmentDebts(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("transacoes: listar dívidas: %w", err)
	}
	out := make([]FutureDebt, 0, len(rows))
	for _, r := range rows {
		percent := pct.Clamp(int64(r.InstallmentsPaid), int64(r.InstallmentTotal))
		out = append(out, FutureDebt{
			ID:               r.GroupID,
			Label:            debtLabel(r.Description),
			InstallmentLabel: installmentLabel(r.InstallmentsPaid, r.InstallmentTotal),
			AmountCents:      r.InstallmentCents,
			Percent:          percent,
			Tone:             debtTone(percent),
			Icon:             r.CategoryIcon,
			Note:             debtNote(percent),
		})
	}
	return out, nil
}
