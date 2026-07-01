package store

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"

	"financial-control/server/internal/store/gen"
)

// ErrCardNotFound sinaliza cartão inexistente (ou de outro usuário, ou não é credit_card, ou
// arquivado) no detalhe do cartão — o handler a trata como 404.
var ErrCardNotFound = errors.New("cartão não encontrado")

// CardSummaryRow é o cabeçalho de um cartão: limite + saldo all-time (centavos). O service
// deriva fatura/disponível/% usado disso (mesma matemática do creditCardView).
type CardSummaryRow struct {
	ID           string
	Name         string
	Icon         string
	DotColor     string
	LimitCents   int64
	BalanceCents int64
}

// CardEntryRow é um lançamento do cartão com o mês de competência (YYYY-MM) e a categoria
// juntada (centavos). Direction em income/expense (mapeado pro client no domínio).
type CardEntryRow struct {
	ID           string
	Month        string
	OccurredOn   time.Time
	Description  string
	Direction    string
	AmountCents  int64
	Kind         string
	CategoryName string
	CategoryIcon string
}

// GetCardSummary devolve o cabeçalho do cartão (escopado por id+user, só credit_card ativo).
// ErrCardNotFound quando não existe, não é do usuário ou não é cartão.
func (s *Store) GetCardSummary(ctx context.Context, userID, cardID string) (CardSummaryRow, error) {
	uid, err := uuidArg(userID)
	if err != nil {
		return CardSummaryRow{}, err
	}
	cid, err := uuidArg(cardID)
	if err != nil {
		return CardSummaryRow{}, ErrCardNotFound
	}
	row, err := s.q.GetCardSummary(ctx, gen.GetCardSummaryParams{CardID: cid, UserID: uid})
	if errors.Is(err, pgx.ErrNoRows) {
		return CardSummaryRow{}, ErrCardNotFound
	}
	if err != nil {
		return CardSummaryRow{}, fmt.Errorf("store: resumo do cartão: %w", err)
	}
	return CardSummaryRow{
		ID:           row.ID,
		Name:         row.Name,
		Icon:         row.Icon,
		DotColor:     row.DotColor,
		LimitCents:   row.LimitCents,
		BalanceCents: row.BalanceCents,
	}, nil
}

// ListCardEntries devolve os lançamentos do cartão (escopado por user+conta), com mês de
// competência e categoria juntada, do mais recente pro mais antigo. O service agrupa em faturas.
func (s *Store) ListCardEntries(ctx context.Context, userID, cardID string) ([]CardEntryRow, error) {
	uid, err := uuidArg(userID)
	if err != nil {
		return nil, err
	}
	cid, err := uuidArg(cardID)
	if err != nil {
		return nil, ErrCardNotFound
	}
	rows, err := s.q.ListCardEntries(ctx, gen.ListCardEntriesParams{UserID: uid, CardID: cid})
	if err != nil {
		return nil, fmt.Errorf("store: lançamentos do cartão: %w", err)
	}
	out := make([]CardEntryRow, 0, len(rows))
	for _, r := range rows {
		out = append(out, CardEntryRow{
			ID:           r.ID,
			Month:        r.Month,
			OccurredOn:   r.OccurredOn.Time,
			Description:  r.Description,
			Direction:    r.Direction,
			AmountCents:  r.AmountCents,
			Kind:         r.Kind,
			CategoryName: r.CategoryName,
			CategoryIcon: r.CategoryIcon,
		})
	}
	return out, nil
}
