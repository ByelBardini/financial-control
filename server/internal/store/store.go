// Package store é a fronteira de dados do server: abre o pool pgx e expõe
// métodos de leitura tipados (valores em centavos), embrulhando o código
// gerado pelo sqlc em internal/store/gen. Toda leitura de dado de usuário é
// escopada por user_id (recebido como parâmetro, derivado do token no handler).
package store

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"financial-control/server/internal/store/gen"
)

// ErrUserNotFound sinaliza usuário inexistente (login/lookup) sem vazar o motivo
// pra fora do server — o service de auth o trata como 401 genérico.
var ErrUserNotFound = errors.New("usuário não encontrado")

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

// UserCredentials é o usuário com o hash da senha — só pro login (FindUserByEmail).
type UserCredentials struct {
	ID           string
	Email        string
	PasswordHash string
	IsActive     bool
	Name         string
}

// User é o usuário sem segredo — pro /auth/me e o check de liveness (GetUserByID).
type User struct {
	ID       string
	Email    string
	IsActive bool
	Name     string
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

// ListAccountsWithBalance devolve as contas ativas do usuário com saldo all-time (centavos).
func (s *Store) ListAccountsWithBalance(ctx context.Context, userID string) ([]AccountRow, error) {
	uid, err := uuidArg(userID)
	if err != nil {
		return nil, err
	}
	rows, err := s.q.ListAccountsWithBalance(ctx, uid)
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

// GetMonthSummary devolve receitas e gastos (centavos) do usuário no mês de month.
func (s *Store) GetMonthSummary(ctx context.Context, userID string, month time.Time) (MonthSummaryRow, error) {
	uid, err := uuidArg(userID)
	if err != nil {
		return MonthSummaryRow{}, err
	}
	row, err := s.q.GetMonthSummary(ctx, gen.GetMonthSummaryParams{UserID: uid, ReferenceDate: dateArg(month)})
	if err != nil {
		return MonthSummaryRow{}, fmt.Errorf("store: resumo do mês: %w", err)
	}
	return MonthSummaryRow{ReceitasCents: row.ReceitasCents, GastosCents: row.GastosCents}, nil
}

// ListCategorySpend devolve o gasto por categoria (centavos) do usuário no mês de month.
func (s *Store) ListCategorySpend(ctx context.Context, userID string, month time.Time) ([]CategorySpendRow, error) {
	uid, err := uuidArg(userID)
	if err != nil {
		return nil, err
	}
	rows, err := s.q.ListCategorySpend(ctx, gen.ListCategorySpendParams{UserID: uid, ReferenceDate: dateArg(month)})
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

// FindUserByEmail busca o usuário por e-mail (case-insensitive). ErrUserNotFound
// quando não existe — pro service de auth manter o 401 genérico + bcrypt dummy.
func (s *Store) FindUserByEmail(ctx context.Context, email string) (UserCredentials, error) {
	row, err := s.q.FindUserByEmail(ctx, email)
	if errors.Is(err, pgx.ErrNoRows) {
		return UserCredentials{}, ErrUserNotFound
	}
	if err != nil {
		return UserCredentials{}, fmt.Errorf("store: buscar usuário por e-mail: %w", err)
	}
	return UserCredentials{
		ID:           row.ID,
		Email:        row.Email,
		PasswordHash: row.PasswordHash,
		IsActive:     row.IsActive,
		Name:         row.Name,
	}, nil
}

// GetUserByID busca o usuário por id. ErrUserNotFound quando não existe (ex.: token
// de usuário já removido).
func (s *Store) GetUserByID(ctx context.Context, userID string) (User, error) {
	uid, err := uuidArg(userID)
	if err != nil {
		return User{}, err
	}
	row, err := s.q.GetUserByID(ctx, uid)
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, ErrUserNotFound
	}
	if err != nil {
		return User{}, fmt.Errorf("store: buscar usuário por id: %w", err)
	}
	return User{ID: row.ID, Email: row.Email, IsActive: row.IsActive, Name: row.Name}, nil
}

// uuidArg converte o user_id (string vinda do token) no pgtype.UUID das queries.
// Erro de formato falha fechado (não vira filtro vazio que devolveria 0 linhas).
func uuidArg(s string) (pgtype.UUID, error) {
	var u pgtype.UUID
	if err := u.Scan(s); err != nil {
		return pgtype.UUID{}, fmt.Errorf("store: user_id inválido (%q): %w", s, err)
	}
	return u, nil
}

// dateArg converte um time.Time para o pgtype.Date esperado pelas queries de mês.
func dateArg(t time.Time) pgtype.Date {
	return pgtype.Date{Time: t, Valid: true}
}
