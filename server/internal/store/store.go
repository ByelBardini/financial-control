// Package store é a fronteira de dados do server: abre o pool pgx e expõe
// métodos de leitura tipados (valores em centavos), embrulhando o código
// gerado pelo sqlc em internal/store/gen.
package store

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"financial-control/server/internal/store/gen"
)

// AccountRow é uma conta com o saldo já calculado em centavos.
type AccountRow struct {
	ID           string
	Name         string
	Icon         string
	Tone         string
	DotColor     string
	BalanceCents int64
}

// MonthSummaryRow são os totais de receitas e gastos de um mês, em centavos.
type MonthSummaryRow struct {
	ReceitasCents int64
	GastosCents   int64
}

// CategorySpendRow é o gasto de uma categoria num mês, em centavos.
type CategorySpendRow struct {
	ID          string
	Label       string
	Tone        string
	AmountCents int64
}

// Store é dona do pool de conexões e das queries geradas.
type Store struct {
	pool *pgxpool.Pool
	q    *gen.Queries
}

// Open abre o pool de conexões e valida a conectividade com um Ping.
//
//	st, err := store.Open(ctx, cfg.DatabaseURL)
func Open(ctx context.Context, dsn string) (*Store, error) {
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return nil, fmt.Errorf("store: abrir pool: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("store: ping no Postgres: %w", err)
	}
	return &Store{pool: pool, q: gen.New(pool)}, nil
}

// Close fecha o pool de conexões.
func (s *Store) Close() {
	s.pool.Close()
}

// ListAccountsWithBalance devolve as contas ativas com o saldo all-time (centavos).
func (s *Store) ListAccountsWithBalance(ctx context.Context) ([]AccountRow, error) {
	rows, err := s.q.ListAccountsWithBalance(ctx)
	if err != nil {
		return nil, fmt.Errorf("store: listar contas com saldo: %w", err)
	}
	out := make([]AccountRow, 0, len(rows))
	for _, r := range rows {
		out = append(out, AccountRow{
			ID:           r.ID,
			Name:         r.Name,
			Icon:         r.Icon,
			Tone:         r.Tone,
			DotColor:     r.DotColor,
			BalanceCents: r.BalanceCents,
		})
	}
	return out, nil
}

// GetMonthSummary devolve receitas e gastos (centavos) do mês que contém month.
func (s *Store) GetMonthSummary(ctx context.Context, month time.Time) (MonthSummaryRow, error) {
	row, err := s.q.GetMonthSummary(ctx, dateArg(month))
	if err != nil {
		return MonthSummaryRow{}, fmt.Errorf("store: resumo do mês: %w", err)
	}
	return MonthSummaryRow{ReceitasCents: row.ReceitasCents, GastosCents: row.GastosCents}, nil
}

// ListCategorySpend devolve o gasto por categoria (centavos) do mês que contém month.
func (s *Store) ListCategorySpend(ctx context.Context, month time.Time) ([]CategorySpendRow, error) {
	rows, err := s.q.ListCategorySpend(ctx, dateArg(month))
	if err != nil {
		return nil, fmt.Errorf("store: gasto por categoria: %w", err)
	}
	out := make([]CategorySpendRow, 0, len(rows))
	for _, r := range rows {
		out = append(out, CategorySpendRow{
			ID:          r.ID,
			Label:       r.Label,
			Tone:        r.Tone,
			AmountCents: r.AmountCents,
		})
	}
	return out, nil
}

// dateArg converte um time.Time para o pgtype.Date esperado pelas queries de mês.
func dateArg(t time.Time) pgtype.Date {
	return pgtype.Date{Time: t, Valid: true}
}
