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

// ErrAccountNotFound sinaliza conta inexistente (ou de outro usuário, ou já
// arquivada) nas operações escopadas por id+user — o handler a trata como 404.
var ErrAccountNotFound = errors.New("conta não encontrada")

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

// BankAccountRow é uma conta de banco (corrente/poupança) com saldo + apresentação.
type BankAccountRow struct {
	ID           string
	Name         string
	Subtitle     string
	BalanceCents int64
	Icon         string
	Tone         string
	DotColor     string
}

// VoucherRow é um vale (benefício) com saldo atual e valor concedido (baseline 100%).
type VoucherRow struct {
	ID           string
	Name         string
	BalanceCents int64
	GrantedCents int64
	Icon         string
}

// CreditAccountRow é um cartão de crédito com saldo (negativo = dívida), limite e
// apresentação (icon/dot_color), p/ a seção "Cartões" e o agregado do Raio-X.
type CreditAccountRow struct {
	ID           string
	Name         string
	BalanceCents int64
	LimitCents   int64
	Icon         string
	DotColor     string
}

// AccountDetail é a conta completa (escopada por id+user) com saldo derivado, em centavos.
type AccountDetail struct {
	ID               string
	Name             string
	AccountType      string
	Subtitle         string
	BalanceCents     int64
	Icon             string
	Tone             string
	DotColor         string
	CreditLimitCents int64
}

// AccountInput são os campos graváveis de uma conta (create/update). Dinheiro em
// centavos inteiros; Subtitle/CreditLimitCents nil = NULL no banco.
type AccountInput struct {
	Name                string
	AccountType         string
	OpeningBalanceCents int64
	Icon                string
	Tone                string
	DotColor            string
	Subtitle            *string
	CreditLimitCents    *int64
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

// ListBankAccounts devolve as contas de banco (corrente/poupança) do usuário, com saldo.
func (s *Store) ListBankAccounts(ctx context.Context, userID string) ([]BankAccountRow, error) {
	uid, err := uuidArg(userID)
	if err != nil {
		return nil, err
	}
	rows, err := s.q.ListBankAccounts(ctx, uid)
	if err != nil {
		return nil, fmt.Errorf("store: listar bancos: %w", err)
	}
	out := make([]BankAccountRow, 0, len(rows))
	for _, r := range rows {
		out = append(out, BankAccountRow{
			ID:           r.ID,
			Name:         r.Name,
			Subtitle:     r.Subtitle,
			BalanceCents: r.BalanceCents,
			Icon:         r.Icon,
			Tone:         r.Tone,
			DotColor:     r.DotColor,
		})
	}
	return out, nil
}

// ListVoucherAccounts devolve os vales (benefícios) do usuário, com saldo e valor concedido.
func (s *Store) ListVoucherAccounts(ctx context.Context, userID string) ([]VoucherRow, error) {
	uid, err := uuidArg(userID)
	if err != nil {
		return nil, err
	}
	rows, err := s.q.ListVoucherAccounts(ctx, uid)
	if err != nil {
		return nil, fmt.Errorf("store: listar vales: %w", err)
	}
	out := make([]VoucherRow, 0, len(rows))
	for _, r := range rows {
		out = append(out, VoucherRow{
			ID:           r.ID,
			Name:         r.Name,
			BalanceCents: r.BalanceCents,
			GrantedCents: r.GrantedCents,
			Icon:         r.Icon,
		})
	}
	return out, nil
}

// GetCashBalance devolve o saldo total das contas em espécie (cash) do usuário, em centavos.
func (s *Store) GetCashBalance(ctx context.Context, userID string) (int64, error) {
	uid, err := uuidArg(userID)
	if err != nil {
		return 0, err
	}
	cents, err := s.q.GetCashBalance(ctx, uid)
	if err != nil {
		return 0, fmt.Errorf("store: saldo da carteira: %w", err)
	}
	return cents, nil
}

// ListCreditAccounts devolve os cartões de crédito do usuário (saldo + limite), em centavos.
func (s *Store) ListCreditAccounts(ctx context.Context, userID string) ([]CreditAccountRow, error) {
	uid, err := uuidArg(userID)
	if err != nil {
		return nil, err
	}
	rows, err := s.q.ListCreditAccounts(ctx, uid)
	if err != nil {
		return nil, fmt.Errorf("store: listar cartões: %w", err)
	}
	out := make([]CreditAccountRow, 0, len(rows))
	for _, r := range rows {
		out = append(out, CreditAccountRow{
			ID:           r.ID,
			Name:         r.Name,
			BalanceCents: r.BalanceCents,
			LimitCents:   r.LimitCents,
			Icon:         r.Icon,
			DotColor:     r.DotColor,
		})
	}
	return out, nil
}

// CreateAccount cria a conta do usuário e devolve o novo id.
func (s *Store) CreateAccount(ctx context.Context, userID string, in AccountInput) (string, error) {
	uid, err := uuidArg(userID)
	if err != nil {
		return "", err
	}
	id, err := s.q.CreateAccount(ctx, gen.CreateAccountParams{
		UserID:              uid,
		Name:                in.Name,
		AccountType:         in.AccountType,
		OpeningBalanceCents: in.OpeningBalanceCents,
		Icon:                in.Icon,
		Tone:                in.Tone,
		DotColor:            in.DotColor,
		Subtitle:            textArg(in.Subtitle),
		CreditLimitCents:    int8Arg(in.CreditLimitCents),
	})
	if err != nil {
		return "", fmt.Errorf("store: criar conta: %w", err)
	}
	return id, nil
}

// UpdateAccount edita a conta (escopada por id+user). ErrAccountNotFound quando não existe.
func (s *Store) UpdateAccount(ctx context.Context, userID, id string, in AccountInput) error {
	uid, err := uuidArg(userID)
	if err != nil {
		return err
	}
	aid, err := uuidArg(id)
	if err != nil {
		return ErrAccountNotFound
	}
	if _, err := s.q.UpdateAccount(ctx, gen.UpdateAccountParams{
		Name:             in.Name,
		AccountType:      in.AccountType,
		Icon:             in.Icon,
		Tone:             in.Tone,
		DotColor:         in.DotColor,
		Subtitle:         textArg(in.Subtitle),
		CreditLimitCents: int8Arg(in.CreditLimitCents),
		ID:               aid,
		UserID:           uid,
	}); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrAccountNotFound
		}
		return fmt.Errorf("store: editar conta: %w", err)
	}
	return nil
}

// ArchiveAccount faz soft-delete da conta (escopada por id+user). ErrAccountNotFound quando não existe.
func (s *Store) ArchiveAccount(ctx context.Context, userID, id string) error {
	uid, err := uuidArg(userID)
	if err != nil {
		return err
	}
	aid, err := uuidArg(id)
	if err != nil {
		return ErrAccountNotFound
	}
	if _, err := s.q.ArchiveAccount(ctx, gen.ArchiveAccountParams{ID: aid, UserID: uid}); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrAccountNotFound
		}
		return fmt.Errorf("store: arquivar conta: %w", err)
	}
	return nil
}

// GetAccountByID devolve a conta do usuário com saldo derivado. ErrAccountNotFound quando não existe.
func (s *Store) GetAccountByID(ctx context.Context, userID, id string) (AccountDetail, error) {
	uid, err := uuidArg(userID)
	if err != nil {
		return AccountDetail{}, err
	}
	aid, err := uuidArg(id)
	if err != nil {
		return AccountDetail{}, ErrAccountNotFound
	}
	row, err := s.q.GetAccountByIDWithBalance(ctx, gen.GetAccountByIDWithBalanceParams{ID: aid, UserID: uid})
	if errors.Is(err, pgx.ErrNoRows) {
		return AccountDetail{}, ErrAccountNotFound
	}
	if err != nil {
		return AccountDetail{}, fmt.Errorf("store: buscar conta por id: %w", err)
	}
	return AccountDetail{
		ID:               row.ID,
		Name:             row.Name,
		AccountType:      row.AccountType,
		Subtitle:         row.Subtitle,
		BalanceCents:     row.BalanceCents,
		Icon:             row.Icon,
		Tone:             row.Tone,
		DotColor:         row.DotColor,
		CreditLimitCents: row.CreditLimitCents,
	}, nil
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

// textArg converte um *string opcional no pgtype.Text das queries (nil = NULL no banco).
func textArg(s *string) pgtype.Text {
	if s == nil {
		return pgtype.Text{}
	}
	return pgtype.Text{String: *s, Valid: true}
}

// int8Arg converte um *int64 opcional (centavos) no pgtype.Int8 das queries (nil = NULL).
func int8Arg(v *int64) pgtype.Int8 {
	if v == nil {
		return pgtype.Int8{}
	}
	return pgtype.Int8{Int64: *v, Valid: true}
}
