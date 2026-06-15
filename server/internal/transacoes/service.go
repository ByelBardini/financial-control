package transacoes

import (
	"context"
	"fmt"
	"strings"
	"time"

	"financial-control/server/internal/pct"
	"financial-control/server/internal/store"
)

// pageSize é o tamanho fixo de página do log de transações (desktop pagina, mobile
// carrega mais — sempre em blocos desse tamanho).
const pageSize = 10

// TransacoesStore é a dependência de dados das views de Transações (escopada por usuário).
// Reaproveita GetMonthSummary do store (já usado pelo dashboard) para o fluxo de caixa.
type TransacoesStore interface {
	GetMonthSummary(ctx context.Context, userID string, month time.Time) (store.MonthSummaryRow, error)
	ListTransactionsFiltered(ctx context.Context, userID string, f store.TransactionFilter) ([]store.TransactionRow, int, error)
	ListRecurringRules(ctx context.Context, userID string) ([]store.RecurringRuleRow, error)
	ListInstallmentDebts(ctx context.Context, userID string) ([]store.InstallmentDebtRow, error)
	ListCategories(ctx context.Context, userID string) ([]store.CategoryRow, error)
	CreateTransaction(ctx context.Context, userID string, in store.TransactionInput) (string, error)
	GetTransactionByID(ctx context.Context, userID, id string) (store.TransactionDetailRow, error)
	UpdateTransaction(ctx context.Context, userID, id string, in store.TransactionInput) error
	DeleteTransaction(ctx context.Context, userID, id string) error
}

// TransactionQuery são os filtros + a página pedidos pela tela. Period: "30d" (default) /
// "3m" / "6m" / "1y" recuam a partir de hoje; "custom" usa From/To (YYYY-MM-DD). CategoryIDs
// vazio = todas (OR entre as informadas). Page é 1-based.
type TransactionQuery struct {
	Period      string
	CategoryIDs []string
	Query       string
	From        string
	To          string
	Page        int
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

// Transactions devolve uma página do log, filtrada por período/categoria/busca, com a
// presentação derivada (data/tag/sentido/ícone) e os metadados de paginação.
func (s *Service) Transactions(ctx context.Context, userID string, q TransactionQuery) (TransactionPage, error) {
	page := q.Page
	if page < 1 {
		page = 1
	}
	since, until := periodBounds(q)
	rows, total, err := s.store.ListTransactionsFiltered(ctx, userID, store.TransactionFilter{
		Since:       since,
		Until:       until,
		CategoryIDs: q.CategoryIDs,
		Query:       strings.TrimSpace(q.Query),
		Limit:       pageSize,
		Offset:      (page - 1) * pageSize,
	})
	if err != nil {
		return TransactionPage{}, fmt.Errorf("transacoes: listar transações: %w", err)
	}
	items := make([]Transaction, 0, len(rows))
	for _, r := range rows {
		tag, tone := transactionTag(r.Direction)
		items = append(items, Transaction{
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
	return TransactionPage{
		Items:     items,
		Page:      page,
		PageSize:  pageSize,
		Total:     total,
		PageCount: pageCount(total, pageSize),
	}, nil
}

// Categories devolve as categorias ativas do usuário (pro filtro de categoria).
func (s *Service) Categories(ctx context.Context, userID string) ([]Category, error) {
	rows, err := s.store.ListCategories(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("transacoes: listar categorias: %w", err)
	}
	out := make([]Category, 0, len(rows))
	for _, r := range rows {
		out = append(out, Category{ID: r.ID, Name: r.Name, Icon: r.Icon, Kind: r.Kind})
	}
	return out, nil
}

// periodBounds devolve o recorte (since, until) do período pedido. "custom" usa From/To
// (datas inválidas → bound daquele lado nil, leniente); os presets recuam a partir de hoje,
// sem teto superior (until nil). Default (incl. "30d") → últimos 30 dias.
func periodBounds(q TransactionQuery) (since, until *time.Time) {
	if q.Period == "custom" {
		return parseDate(q.From), parseDate(q.To)
	}
	s := periodSince(q.Period)
	return &s, nil
}

// periodSince traduz um preset de período no recorte inferior de data. "3m"/"6m"/"1y"
// recuam meses/ano; qualquer outro valor (incl. "30d"/""/desconhecido) → últimos 30 dias.
func periodSince(period string) time.Time {
	now := time.Now()
	switch period {
	case "3m":
		return now.AddDate(0, -3, 0)
	case "6m":
		return now.AddDate(0, -6, 0)
	case "1y":
		return now.AddDate(-1, 0, 0)
	default: // "30d", "", desconhecido
		return now.AddDate(0, 0, -30)
	}
}

// parseDate lê uma data YYYY-MM-DD; vazia ou inválida → nil (filtro daquele lado desligado).
func parseDate(s string) *time.Time {
	if s == "" {
		return nil
	}
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return nil
	}
	return &t
}

// pageCount devolve o número de páginas para total itens de size em size (0 quando vazio).
func pageCount(total, size int) int {
	if total <= 0 || size <= 0 {
		return 0
	}
	return (total + size - 1) / size
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
