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

// ErrTransactionNotFound sinaliza transação inexistente (ou de outro usuário), ou
// conta/categoria inválida na criação — o handler a trata como 404 (leitura/edição/
// exclusão) ou 400 (criação, quando a conta/categoria do corpo não é do usuário).
var ErrTransactionNotFound = errors.New("transação não encontrada")

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

// LiquidBreakdownRow é a quebra do patrimônio em contas (centavos): líquido = bancos +
// espécie ("quanto eu tenho hoje"); a dívida de cartão (saldo negativo, em positivo) e os
// vales ficam à parte (não entram no líquido).
type LiquidBreakdownRow struct {
	BankCents     int64
	CashCents     int64
	CardDebtCents int64
	VoucherCents  int64
}

// TransactionRow é uma transação do log, com conta e categoria já juntadas (centavos).
// OccurredOn é a data de competência (sem hora); a formatação do rótulo é feita no domínio.
type TransactionRow struct {
	ID            string
	OccurredOn    time.Time
	Description   string
	AccountName   string
	CategoryName  string
	CategoryIcon  string
	Direction     string
	AmountCents   int64
	Kind          string // 'standard'/'installment'/'transfer' — alimenta a tag (Parcelado)
	IsRecurring   bool   // veio de uma regra (recurring_rule_id) — alimenta a tag (Fixo/Esperado)
	Essentialness string // 'essential'/'discretionary' da categoria — alimenta a tag (Sobrevivência/Supérfluo)
}

// RecurringRuleRow é uma regra de recorrência ativa, com a categoria juntada (centavos) e os
// sinais pro cálculo de "devido" no service: frequência/datas/limite + agregados das transações
// ligadas (LastOccurredOn = MAX competência, nil se nunca lançada; OccurrenceCount = nº lançadas).
type RecurringRuleRow struct {
	ID              string
	Description     string
	CategoryName    string
	CategoryIcon    string
	Direction       string
	AmountCents     int64
	Frequency       string
	StartDate       time.Time
	EndDate         *time.Time
	MaxOccurrences  *int
	LastOccurredOn  *time.Time
	OccurrenceCount int
}

// InstallmentDebtRow é uma compra parcelada agregada por purchase_group_id: progresso
// (parcelas lançadas / total) + valor da parcela (centavos).
type InstallmentDebtRow struct {
	GroupID          string
	Description      string
	InstallmentTotal int
	InstallmentsPaid int
	InstallmentCents int64
	CategoryIcon     string
}

// TransactionFilter são os filtros + paginação do log de transações. Since/Until nil = sem
// recorte de tempo daquele lado; CategoryIDs vazio = todas as categorias (filtro OR entre
// as informadas); Query "" = sem busca.
type TransactionFilter struct {
	Since       *time.Time
	Until       *time.Time
	CategoryIDs []string
	Query       string
	Limit       int
	Offset      int
}

// CategoryRow é uma categoria do usuário (id + apresentação) p/ o filtro de categoria.
type CategoryRow struct {
	ID   string
	Name string
	Icon string
	Kind string
}

// TransactionInput são os campos graváveis de uma transação 'standard'. Direction em
// income/expense (mapeado no domínio a partir de inflow/outflow); dinheiro em centavos;
// CategoryID nil = sem categoria; OccurredOn é a data de competência (sem hora).
type TransactionInput struct {
	AccountID   string
	CategoryID  *string
	Description string
	Direction   string
	AmountCents int64
	OccurredOn  time.Time
}

// InstallmentInput é uma compra parcelada (sempre despesa): valor POR parcela + nº de
// parcelas. A 1ª parcela cai em OccurredOn; as demais, mês a mês.
type InstallmentInput struct {
	AccountID   string
	CategoryID  *string
	Description string
	AmountCents int64 // por parcela
	Total       int
	OccurredOn  time.Time
}

// RecurringRuleInput é uma regra de recorrência (Direction em income/expense). Fim opcional:
// EndDate XOR MaxOccurrences (mutuamente exclusivos; nil/nil = permanente).
type RecurringRuleInput struct {
	AccountID      string
	CategoryID     *string
	Description    string
	Direction      string
	AmountCents    int64
	Frequency      string // daily/weekly/monthly/yearly
	IntervalCount  int
	StartDate      time.Time
	EndDate        *time.Time
	MaxOccurrences *int
}

// TransactionDetailRow é a transação completa (escopada por id+user) com conta/categoria
// juntadas, em centavos. CategoryID vazio = sem categoria.
type TransactionDetailRow struct {
	ID           string
	AccountID    string
	CategoryID   string
	Description  string
	Direction    string
	AmountCents  int64
	OccurredOn   time.Time
	AccountName  string
	CategoryName string
	CategoryIcon string
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

// GetLiquidBreakdown soma o saldo das contas do usuário por tipo (centavos): bancos
// (checking/savings) + espécie (cash) = líquido; dívida de cartão (saldo negativo, em
// positivo) e vales saem à parte. Uma varredura só (FILTER por tipo).
func (s *Store) GetLiquidBreakdown(ctx context.Context, userID string) (LiquidBreakdownRow, error) {
	uid, err := uuidArg(userID)
	if err != nil {
		return LiquidBreakdownRow{}, err
	}
	row, err := s.q.GetLiquidBreakdown(ctx, uid)
	if err != nil {
		return LiquidBreakdownRow{}, fmt.Errorf("store: quebra do patrimônio em contas: %w", err)
	}
	return LiquidBreakdownRow{
		BankCents:     row.BankCents,
		CashCents:     row.CashCents,
		CardDebtCents: row.CardDebtCents,
		VoucherCents:  row.VoucherCents,
	}, nil
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

// ListTransactionsFiltered devolve uma página de transações do usuário (centavos) com os
// filtros aplicados, mais o total que casou o filtro (do COUNT window, lido da 1ª linha;
// 0 linhas → total 0). Categoria malformada é ignorada (vira "sem filtro"), não erra.
func (s *Store) ListTransactionsFiltered(ctx context.Context, userID string, f TransactionFilter) ([]TransactionRow, int, error) {
	uid, err := uuidArg(userID)
	if err != nil {
		return nil, 0, err
	}
	rows, err := s.q.ListTransactionsFiltered(ctx, gen.ListTransactionsFilteredParams{
		UserID:      uid,
		Since:       dateArgN(f.Since),
		Until:       dateArgN(f.Until),
		CategoryIds: uuidSlice(f.CategoryIDs),
		Q:           f.Query,
		Lim:         int32(f.Limit),
		Off:         int32(f.Offset),
	})
	if err != nil {
		return nil, 0, fmt.Errorf("store: listar transações filtradas: %w", err)
	}
	out := make([]TransactionRow, 0, len(rows))
	total := 0
	for _, r := range rows {
		total = int(r.TotalCount)
		out = append(out, TransactionRow{
			ID:            r.ID,
			OccurredOn:    r.OccurredOn.Time,
			Description:   r.Description,
			AccountName:   r.AccountName,
			CategoryName:  r.CategoryName,
			CategoryIcon:  r.CategoryIcon,
			Direction:     r.Direction,
			AmountCents:   r.AmountCents,
			Kind:          r.Kind,
			IsRecurring:   r.IsRecurring,
			Essentialness: r.Essentialness,
		})
	}
	return out, total, nil
}

// ListCategories devolve as categorias ativas do usuário (alimenta o filtro de categoria).
func (s *Store) ListCategories(ctx context.Context, userID string) ([]CategoryRow, error) {
	uid, err := uuidArg(userID)
	if err != nil {
		return nil, err
	}
	rows, err := s.q.ListCategories(ctx, uid)
	if err != nil {
		return nil, fmt.Errorf("store: listar categorias: %w", err)
	}
	out := make([]CategoryRow, 0, len(rows))
	for _, r := range rows {
		out = append(out, CategoryRow{ID: r.ID, Name: r.Name, Icon: r.Icon, Kind: r.Kind})
	}
	return out, nil
}

// ListRecurringRules devolve as regras de recorrência ativas do usuário (centavos).
func (s *Store) ListRecurringRules(ctx context.Context, userID string) ([]RecurringRuleRow, error) {
	uid, err := uuidArg(userID)
	if err != nil {
		return nil, err
	}
	rows, err := s.q.ListActiveRecurringRules(ctx, uid)
	if err != nil {
		return nil, fmt.Errorf("store: listar recorrências: %w", err)
	}
	out := make([]RecurringRuleRow, 0, len(rows))
	for _, r := range rows {
		out = append(out, RecurringRuleRow{
			ID:              r.ID,
			Description:     r.Description,
			CategoryName:    r.CategoryName,
			CategoryIcon:    r.CategoryIcon,
			Direction:       r.Direction,
			AmountCents:     r.AmountCents,
			Frequency:       r.Frequency,
			StartDate:       r.StartDate.Time,
			EndDate:         datePtr(r.EndDate),
			MaxOccurrences:  int4Ptr(r.MaxOccurrences),
			LastOccurredOn:  datePtr(r.LastOccurredOn),
			OccurrenceCount: int(r.OccurrenceCount),
		})
	}
	return out, nil
}

// ListInstallmentDebts devolve as compras parceladas do usuário agregadas por grupo (centavos).
func (s *Store) ListInstallmentDebts(ctx context.Context, userID string) ([]InstallmentDebtRow, error) {
	uid, err := uuidArg(userID)
	if err != nil {
		return nil, err
	}
	rows, err := s.q.ListInstallmentDebts(ctx, uid)
	if err != nil {
		return nil, fmt.Errorf("store: listar dívidas: %w", err)
	}
	out := make([]InstallmentDebtRow, 0, len(rows))
	for _, r := range rows {
		out = append(out, InstallmentDebtRow{
			GroupID:          r.GroupID,
			Description:      r.Description,
			InstallmentTotal: int(r.InstallmentTotal),
			InstallmentsPaid: int(r.InstallmentsPaid),
			InstallmentCents: r.InstallmentCents,
			CategoryIcon:     r.CategoryIcon,
		})
	}
	return out, nil
}

// CreateTransaction cria a transação 'standard' do usuário e devolve o novo id. A query
// só insere se a conta (e a categoria, se houver) são do usuário; 0 linhas →
// ErrTransactionNotFound (o handler de criação responde 400). Saldo é derivado, então a
// nova transação já entra nos cálculos de saldo/mês — sem cache pra atualizar.
func (s *Store) CreateTransaction(ctx context.Context, userID string, in TransactionInput) (string, error) {
	uid, err := uuidArg(userID)
	if err != nil {
		return "", err
	}
	aid, err := uuidArg(in.AccountID)
	if err != nil {
		return "", ErrTransactionNotFound
	}
	cid, err := uuidArgN(in.CategoryID)
	if err != nil {
		return "", ErrTransactionNotFound
	}
	id, err := s.q.CreateTransaction(ctx, gen.CreateTransactionParams{
		UserID:      uid,
		AccountID:   aid,
		CategoryID:  cid,
		Description: in.Description,
		Direction:   in.Direction,
		AmountCents: in.AmountCents,
		OccurredOn:  dateArg(in.OccurredOn),
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrTransactionNotFound
	}
	if err != nil {
		return "", fmt.Errorf("store: criar transação: %w", err)
	}
	return id, nil
}

// CreateInstallmentPurchase cria as N parcelas (valor por parcela) numa só query atômica e
// devolve o nº de linhas inseridas. 0 → conta/categoria não é do usuário (handler responde 400).
func (s *Store) CreateInstallmentPurchase(ctx context.Context, userID string, in InstallmentInput) (int64, error) {
	uid, err := uuidArg(userID)
	if err != nil {
		return 0, err
	}
	aid, err := uuidArg(in.AccountID)
	if err != nil {
		return 0, ErrTransactionNotFound
	}
	cid, err := uuidArgN(in.CategoryID)
	if err != nil {
		return 0, ErrTransactionNotFound
	}
	n, err := s.q.CreateInstallmentPurchase(ctx, gen.CreateInstallmentPurchaseParams{
		UserID:      uid,
		AccountID:   aid,
		CategoryID:  cid,
		Description: pgtype.Text{String: in.Description, Valid: true},
		Total:       int32(in.Total),
		AmountCents: in.AmountCents,
		OccurredOn:  dateArg(in.OccurredOn),
	})
	if err != nil {
		return 0, fmt.Errorf("store: criar compra parcelada: %w", err)
	}
	return n, nil
}

// CreateRecurringRule cria a regra de recorrência (modelo puro — NÃO lança transação; cada
// ocorrência é registrada depois via RegisterRecurringOccurrence). Devolve o nº de regras criadas
// (1 = ok; 0 = conta/categoria não é do usuário → handler responde 400).
func (s *Store) CreateRecurringRule(ctx context.Context, userID string, in RecurringRuleInput) (int64, error) {
	uid, err := uuidArg(userID)
	if err != nil {
		return 0, err
	}
	aid, err := uuidArg(in.AccountID)
	if err != nil {
		return 0, ErrTransactionNotFound
	}
	cid, err := uuidArgN(in.CategoryID)
	if err != nil {
		return 0, ErrTransactionNotFound
	}
	n, err := s.q.CreateRecurringRule(ctx, gen.CreateRecurringRuleParams{
		UserID:         uid,
		AccountID:      aid,
		CategoryID:     cid,
		Description:    in.Description,
		Direction:      in.Direction,
		AmountCents:    in.AmountCents,
		Frequency:      in.Frequency,
		IntervalCount:  int32(in.IntervalCount),
		StartDate:      dateArg(in.StartDate),
		EndDate:        dateArgN(in.EndDate),
		MaxOccurrences: int4ArgN(in.MaxOccurrences),
	})
	if err != nil {
		return 0, fmt.Errorf("store: criar recorrência: %w", err)
	}
	return n, nil
}

// GetRecurringRuleForRegister devolve uma regra ativa do usuário (escopada por id+user) com os
// sinais de "devido" (frequência/datas/limite + agregados). ErrTransactionNotFound quando não
// existe, não é do usuário ou está inativa.
func (s *Store) GetRecurringRuleForRegister(ctx context.Context, userID, ruleID string) (RecurringRuleRow, error) {
	uid, err := uuidArg(userID)
	if err != nil {
		return RecurringRuleRow{}, err
	}
	rid, err := uuidArg(ruleID)
	if err != nil {
		return RecurringRuleRow{}, ErrTransactionNotFound
	}
	r, err := s.q.GetRecurringRuleForRegister(ctx, gen.GetRecurringRuleForRegisterParams{ID: rid, UserID: uid})
	if errors.Is(err, pgx.ErrNoRows) {
		return RecurringRuleRow{}, ErrTransactionNotFound
	}
	if err != nil {
		return RecurringRuleRow{}, fmt.Errorf("store: buscar recorrência por id: %w", err)
	}
	return RecurringRuleRow{
		ID:              r.ID,
		Description:     r.Description,
		CategoryName:    r.CategoryName,
		CategoryIcon:    r.CategoryIcon,
		Direction:       r.Direction,
		AmountCents:     r.AmountCents,
		Frequency:       r.Frequency,
		StartDate:       r.StartDate.Time,
		EndDate:         datePtr(r.EndDate),
		MaxOccurrences:  int4Ptr(r.MaxOccurrences),
		LastOccurredOn:  datePtr(r.LastOccurredOn),
		OccurrenceCount: int(r.OccurrenceCount),
	}, nil
}

// RegisterRecurringOccurrence lança a transação 'standard' do período atual a partir de uma regra
// (copia os campos dela; occurredOn = hoje, vindo do service) e devolve o id da nova transação.
// ErrTransactionNotFound quando a regra não é do usuário ou está inativa.
func (s *Store) RegisterRecurringOccurrence(ctx context.Context, userID, ruleID string, occurredOn time.Time) (string, error) {
	uid, err := uuidArg(userID)
	if err != nil {
		return "", err
	}
	rid, err := uuidArg(ruleID)
	if err != nil {
		return "", ErrTransactionNotFound
	}
	id, err := s.q.RegisterRecurringOccurrence(ctx, gen.RegisterRecurringOccurrenceParams{
		RuleID:     rid,
		UserID:     uid,
		OccurredOn: dateArg(occurredOn),
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrTransactionNotFound
	}
	if err != nil {
		return "", fmt.Errorf("store: registrar ocorrência da recorrência: %w", err)
	}
	return id, nil
}

// GetTransactionByID devolve a transação do usuário (escopada por id+user) com conta e
// categoria juntadas. ErrTransactionNotFound quando não existe ou não é do usuário.
func (s *Store) GetTransactionByID(ctx context.Context, userID, id string) (TransactionDetailRow, error) {
	uid, err := uuidArg(userID)
	if err != nil {
		return TransactionDetailRow{}, err
	}
	tid, err := uuidArg(id)
	if err != nil {
		return TransactionDetailRow{}, ErrTransactionNotFound
	}
	row, err := s.q.GetTransactionByID(ctx, gen.GetTransactionByIDParams{ID: tid, UserID: uid})
	if errors.Is(err, pgx.ErrNoRows) {
		return TransactionDetailRow{}, ErrTransactionNotFound
	}
	if err != nil {
		return TransactionDetailRow{}, fmt.Errorf("store: buscar transação por id: %w", err)
	}
	return TransactionDetailRow{
		ID:           row.ID,
		AccountID:    row.AccountID,
		CategoryID:   row.CategoryID,
		Description:  row.Description,
		Direction:    row.Direction,
		AmountCents:  row.AmountCents,
		OccurredOn:   row.OccurredOn.Time,
		AccountName:  row.AccountName,
		CategoryName: row.CategoryName,
		CategoryIcon: row.CategoryIcon,
	}, nil
}

// UpdateTransaction edita a transação (escopada por id+user; não troca de conta).
// ErrTransactionNotFound quando não existe (ou a categoria nova não é do usuário).
func (s *Store) UpdateTransaction(ctx context.Context, userID, id string, in TransactionInput) error {
	uid, err := uuidArg(userID)
	if err != nil {
		return err
	}
	tid, err := uuidArg(id)
	if err != nil {
		return ErrTransactionNotFound
	}
	cid, err := uuidArgN(in.CategoryID)
	if err != nil {
		return ErrTransactionNotFound
	}
	if _, err := s.q.UpdateTransaction(ctx, gen.UpdateTransactionParams{
		CategoryID:  cid,
		Description: in.Description,
		Direction:   in.Direction,
		AmountCents: in.AmountCents,
		OccurredOn:  dateArg(in.OccurredOn),
		ID:          tid,
		UserID:      uid,
	}); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrTransactionNotFound
		}
		return fmt.Errorf("store: editar transação: %w", err)
	}
	return nil
}

// DeleteTransaction exclui a transação (hard delete, escopada por id+user).
// ErrTransactionNotFound quando não existe ou não é do usuário.
func (s *Store) DeleteTransaction(ctx context.Context, userID, id string) error {
	uid, err := uuidArg(userID)
	if err != nil {
		return err
	}
	tid, err := uuidArg(id)
	if err != nil {
		return ErrTransactionNotFound
	}
	if _, err := s.q.DeleteTransaction(ctx, gen.DeleteTransactionParams{ID: tid, UserID: uid}); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrTransactionNotFound
		}
		return fmt.Errorf("store: excluir transação: %w", err)
	}
	return nil
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

// uuidArgN converte um *string opcional no pgtype.UUID das queries (nil = NULL). Formato
// inválido falha fechado (erro), pra não virar um NULL silencioso.
func uuidArgN(s *string) (pgtype.UUID, error) {
	if s == nil {
		return pgtype.UUID{}, nil
	}
	return uuidArg(*s)
}

// uuidSlice converte ids (strings do client) em []pgtype.UUID, descartando os malformados.
// Usado no filtro multi-categoria (`= ANY`): id inválido simplesmente não entra na lista.
func uuidSlice(ids []string) []pgtype.UUID {
	out := make([]pgtype.UUID, 0, len(ids))
	for _, id := range ids {
		if u, err := uuidArg(id); err == nil {
			out = append(out, u)
		}
	}
	return out
}

// dateArg converte um time.Time para o pgtype.Date esperado pelas queries de mês.
func dateArg(t time.Time) pgtype.Date {
	return pgtype.Date{Time: t, Valid: true}
}

// dateArgN converte um *time.Time opcional no pgtype.Date das queries (nil = NULL),
// usado pelo filtro de período (Since) do log de transações.
func dateArgN(t *time.Time) pgtype.Date {
	if t == nil {
		return pgtype.Date{}
	}
	return pgtype.Date{Time: *t, Valid: true}
}

// int4ArgN converte um *int opcional no pgtype.Int4 das queries (nil = NULL), usado pelo
// max_occurrences (fim opcional) da regra de recorrência.
func int4ArgN(n *int) pgtype.Int4 {
	if n == nil {
		return pgtype.Int4{}
	}
	return pgtype.Int4{Int32: int32(*n), Valid: true}
}

// datePtr lê um pgtype.Date nullable das queries num *time.Time (NULL → nil) — usado pelos
// campos opcionais da regra de recorrência (end_date, last_occurred_on agregado).
func datePtr(d pgtype.Date) *time.Time {
	if !d.Valid {
		return nil
	}
	t := d.Time
	return &t
}

// int4Ptr lê um pgtype.Int4 nullable das queries num *int (NULL → nil) — usado pelo
// max_occurrences da regra de recorrência.
func int4Ptr(n pgtype.Int4) *int {
	if !n.Valid {
		return nil
	}
	v := int(n.Int32)
	return &v
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
