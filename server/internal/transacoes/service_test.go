package transacoes_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"financial-control/server/internal/store"
	"financial-control/server/internal/transacoes"
)

// fakeStore é o fake nomeado da dependência de dados (sem banco). Captura o userID
// recebido pra provar o escopo por usuário em cada query.
type fakeStore struct {
	summary   store.MonthSummaryRow
	txns      []store.TransactionRow
	total     int
	gotFilter store.TransactionFilter
	cats      []store.CategoryRow
	rules     []store.RecurringRuleRow
	debts     []store.InstallmentDebtRow
	err       error
	gotUserID string

	// escrita (CRUD)
	createID  string
	detail    store.TransactionDetailRow
	createErr error
	getErr    error
	updateErr error
	deleteErr error
	gotInput  store.TransactionInput
	gotID     string

	// parcelamento
	installmentRows int64
	installmentErr  error
	gotInstallment  store.InstallmentInput

	// recorrência
	recurringRows int64
	recurringErr  error
	gotRecurring  store.RecurringRuleInput
}

func (f *fakeStore) GetMonthSummary(_ context.Context, userID string, _ time.Time) (store.MonthSummaryRow, error) {
	f.gotUserID = userID
	return f.summary, f.err
}

func (f *fakeStore) ListTransactionsFiltered(_ context.Context, userID string, filter store.TransactionFilter) ([]store.TransactionRow, int, error) {
	f.gotUserID = userID
	f.gotFilter = filter
	return f.txns, f.total, f.err
}

func (f *fakeStore) ListCategories(_ context.Context, userID string) ([]store.CategoryRow, error) {
	f.gotUserID = userID
	return f.cats, f.err
}

func (f *fakeStore) ListRecurringRules(_ context.Context, userID string) ([]store.RecurringRuleRow, error) {
	f.gotUserID = userID
	return f.rules, f.err
}

func (f *fakeStore) ListInstallmentDebts(_ context.Context, userID string) ([]store.InstallmentDebtRow, error) {
	f.gotUserID = userID
	return f.debts, f.err
}

func (f *fakeStore) CreateTransaction(_ context.Context, userID string, in store.TransactionInput) (string, error) {
	f.gotUserID = userID
	f.gotInput = in
	return f.createID, f.createErr
}

func (f *fakeStore) CreateInstallmentPurchase(_ context.Context, userID string, in store.InstallmentInput) (int64, error) {
	f.gotUserID = userID
	f.gotInstallment = in
	return f.installmentRows, f.installmentErr
}

func (f *fakeStore) CreateRecurringRuleWithFirst(_ context.Context, userID string, in store.RecurringRuleInput) (int64, error) {
	f.gotUserID = userID
	f.gotRecurring = in
	return f.recurringRows, f.recurringErr
}

func (f *fakeStore) GetTransactionByID(_ context.Context, userID, id string) (store.TransactionDetailRow, error) {
	f.gotUserID = userID
	f.gotID = id
	return f.detail, f.getErr
}

func (f *fakeStore) UpdateTransaction(_ context.Context, userID, id string, in store.TransactionInput) error {
	f.gotUserID = userID
	f.gotID = id
	f.gotInput = in
	return f.updateErr
}

func (f *fakeStore) DeleteTransaction(_ context.Context, userID, id string) error {
	f.gotUserID = userID
	f.gotID = id
	return f.deleteErr
}

func TestCashflowSummaryMapeiaEDerivaColapso(t *testing.T) {
	fake := &fakeStore{summary: store.MonthSummaryRow{ReceitasCents: 320000, GastosCents: 111550}}
	got, err := transacoes.NewService(fake).CashflowSummary(context.Background(), "u-1", time.Now())
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if fake.gotUserID != "u-1" {
		t.Errorf("store recebeu userID %q, quero u-1 (escopo)", fake.gotUserID)
	}
	if got.InflowCents != 320000 || got.OutflowCents != 111550 || got.NetBurnCents != 208450 {
		t.Errorf("fluxo = {in %d, out %d, net %d}, quero {320000,111550,208450}", got.InflowCents, got.OutflowCents, got.NetBurnCents)
	}
	if got.BurnPercent != 35 {
		t.Errorf("burnPercent = %d, quero 35", got.BurnPercent)
	}
	if got.Collapse.Percent != 35 || got.Collapse.LevelTone != "secondary" {
		t.Errorf("collapse = {%d,%q}, quero {35,secondary}", got.Collapse.Percent, got.Collapse.LevelTone)
	}
}

func TestTransactionsMapeiaLabelsTagESentido(t *testing.T) {
	occurred := time.Date(2026, 6, 12, 0, 0, 0, 0, time.UTC)
	fake := &fakeStore{total: 2, txns: []store.TransactionRow{
		{ID: "t1", OccurredOn: occurred, Description: "iFood", AccountName: "Nubank", CategoryName: "Alimentação", CategoryIcon: "fastfood", Direction: "expense", AmountCents: 8990, Kind: "standard", Essentialness: "essential"},
		{ID: "t2", OccurredOn: occurred, Description: "Salário", AccountName: "Nubank", CategoryName: "Salário", CategoryIcon: "payments", Direction: "income", AmountCents: 320000, Kind: "standard", IsRecurring: true},
	}}
	got, err := transacoes.NewService(fake).Transactions(context.Background(), "u-9", transacoes.TransactionQuery{})
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if fake.gotUserID != "u-9" {
		t.Errorf("escopo: userID = %q, quero u-9", fake.gotUserID)
	}
	if got.Page != 1 || got.Total != 2 || got.PageCount != 1 {
		t.Errorf("paginação = {page %d, total %d, pageCount %d}, quero {1,2,1}", got.Page, got.Total, got.PageCount)
	}
	want0 := transacoes.Transaction{
		ID: "t1", DateLabel: "12 JUN", TimeLabel: "12/06", Title: "iFood", AccountLabel: "Nubank",
		Category: "Alimentação", Tag: "Sobrevivência", TagTone: "error", AmountCents: 8990,
		Direction: "outflow", Icon: "fastfood",
	}
	if got.Items[0] != want0 {
		t.Errorf("items[0] = %+v\nquero      %+v", got.Items[0], want0)
	}
	if got.Items[1].Direction != "inflow" || got.Items[1].Tag != "Inflow Esperado" || got.Items[1].TagTone != "secondary" {
		t.Errorf("receita = {%q,%q,%q}, quero {inflow,Inflow Esperado,secondary}", got.Items[1].Direction, got.Items[1].Tag, got.Items[1].TagTone)
	}
}

func TestTransactionsPeriodoEPaginacao(t *testing.T) {
	now := time.Now()

	// Default "30d": recorta ~30 dias (sem teto) e a página 2 desloca pelo pageSize; as
	// categorias são repassadas (OR no server).
	fake := &fakeStore{total: 25}
	got, err := transacoes.NewService(fake).Transactions(context.Background(), "u-1",
		transacoes.TransactionQuery{Period: "30d", Page: 2, CategoryIDs: []string{"c1", "c2"}})
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if fake.gotFilter.Since == nil || fake.gotFilter.Until != nil {
		t.Fatalf("30d: since/until = %v/%v, quero {não-nil, nil}", fake.gotFilter.Since, fake.gotFilter.Until)
	}
	if d := now.Sub(*fake.gotFilter.Since).Hours() / 24; d < 29 || d > 31 {
		t.Errorf("30d: since ~%.0f dias atrás, quero ~30", d)
	}
	if len(fake.gotFilter.CategoryIDs) != 2 || fake.gotFilter.CategoryIDs[0] != "c1" {
		t.Errorf("categoryIDs = %v, quero [c1 c2]", fake.gotFilter.CategoryIDs)
	}
	if fake.gotFilter.Offset != fake.gotFilter.Limit { // página 2 → offset = pageSize
		t.Errorf("página 2: offset = %d, quero limit %d", fake.gotFilter.Offset, fake.gotFilter.Limit)
	}
	if got.PageCount != 3 || got.Page != 2 { // 25/10 = 3
		t.Errorf("paginação = {page %d, pageCount %d}, quero {2,3}", got.Page, got.PageCount)
	}

	// "3m" recua bem mais que "30d".
	threeM := &fakeStore{}
	if _, err := transacoes.NewService(threeM).Transactions(context.Background(), "u-1", transacoes.TransactionQuery{Period: "3m"}); err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if threeM.gotFilter.Since == nil || now.Sub(*threeM.gotFilter.Since).Hours()/24 < 80 {
		t.Errorf("3m: since deveria recuar ~90 dias, veio %v", threeM.gotFilter.Since)
	}

	// "custom": usa from/to exatos como recorte inferior/superior.
	custom := &fakeStore{}
	if _, err := transacoes.NewService(custom).Transactions(context.Background(), "u-1",
		transacoes.TransactionQuery{Period: "custom", From: "2026-01-10", To: "2026-02-20"}); err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if custom.gotFilter.Since == nil || custom.gotFilter.Since.Format("2006-01-02") != "2026-01-10" {
		t.Errorf("custom since = %v, quero 2026-01-10", custom.gotFilter.Since)
	}
	if custom.gotFilter.Until == nil || custom.gotFilter.Until.Format("2006-01-02") != "2026-02-20" {
		t.Errorf("custom until = %v, quero 2026-02-20", custom.gotFilter.Until)
	}
}

func TestTransactionsPageSizeDinamico(t *testing.T) {
	// pageSize custom vira o Limit/Offset e recalcula o pageCount do envelope.
	custom := &fakeStore{total: 12}
	got, err := transacoes.NewService(custom).Transactions(context.Background(), "u-1",
		transacoes.TransactionQuery{PageSize: 5, Page: 2})
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if custom.gotFilter.Limit != 5 {
		t.Errorf("Limit = %d, quero 5 (pageSize custom)", custom.gotFilter.Limit)
	}
	if custom.gotFilter.Offset != 5 { // página 2 → offset = pageSize
		t.Errorf("Offset = %d, quero 5", custom.gotFilter.Offset)
	}
	if got.PageSize != 5 || got.PageCount != 3 { // 12/5 = 3
		t.Errorf("envelope = {pageSize %d, pageCount %d}, quero {5,3}", got.PageSize, got.PageCount)
	}

	// pageSize <= 0 cai no default 10.
	zero := &fakeStore{total: 10}
	gotZero, err := transacoes.NewService(zero).Transactions(context.Background(), "u-1",
		transacoes.TransactionQuery{PageSize: 0})
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if zero.gotFilter.Limit != 10 || gotZero.PageSize != 10 {
		t.Errorf("pageSize 0 → {Limit %d, envelope %d}, quero {10,10}", zero.gotFilter.Limit, gotZero.PageSize)
	}

	// acima do teto é limitado (não deixa a query ilimitada).
	big := &fakeStore{}
	if _, err := transacoes.NewService(big).Transactions(context.Background(), "u-1",
		transacoes.TransactionQuery{PageSize: 500}); err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if big.gotFilter.Limit != 100 {
		t.Errorf("pageSize 500 → Limit %d, quero 100 (teto)", big.gotFilter.Limit)
	}
}

func TestCategoriesMapeia(t *testing.T) {
	fake := &fakeStore{cats: []store.CategoryRow{
		{ID: "c1", Name: "Alimentação", Icon: "restaurant", Kind: "expense"},
	}}
	got, err := transacoes.NewService(fake).Categories(context.Background(), "u-7")
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if fake.gotUserID != "u-7" {
		t.Errorf("escopo: userID = %q, quero u-7", fake.gotUserID)
	}
	want := transacoes.Category{ID: "c1", Name: "Alimentação", Icon: "restaurant", Kind: "expense"}
	if len(got) != 1 || got[0] != want {
		t.Errorf("got = %+v, quero [%+v]", got, want)
	}
}

func TestRecurrencesMapeiaSentido(t *testing.T) {
	fake := &fakeStore{rules: []store.RecurringRuleRow{
		{ID: "r1", Description: "Salário Base", CategoryName: "Salário", CategoryIcon: "payments", Direction: "income", AmountCents: 500000},
		{ID: "r2", Description: "Netflix", CategoryName: "Lazer", CategoryIcon: "subscriptions", Direction: "expense", AmountCents: 5590},
	}}
	got, err := transacoes.NewService(fake).Recurrences(context.Background(), "u-1")
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	want0 := transacoes.Recurrence{ID: "r1", Name: "Salário Base", Category: "Salário", AmountCents: 500000, Direction: "inflow", Icon: "payments"}
	if got[0] != want0 {
		t.Errorf("got[0] = %+v, quero %+v", got[0], want0)
	}
	if got[1].Direction != "outflow" {
		t.Errorf("got[1].Direction = %q, quero outflow", got[1].Direction)
	}
}

func TestFutureDebtsDerivaProgressoELabel(t *testing.T) {
	fake := &fakeStore{debts: []store.InstallmentDebtRow{
		{GroupID: "g1", Description: "Fone (1/3)", InstallmentTotal: 3, InstallmentsPaid: 2, InstallmentCents: 10000, CategoryIcon: "headphones"},
	}}
	got, err := transacoes.NewService(fake).FutureDebts(context.Background(), "u-1")
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	want := transacoes.FutureDebt{
		ID: "g1", Label: "Fone", InstallmentLabel: "Parcela 2/3", AmountCents: 10000,
		Percent: 67, Tone: "primary", Icon: "headphones", Note: "Decisão financeira questionável.",
	}
	if got[0] != want {
		t.Errorf("got[0] = %+v\nquero    %+v", got[0], want)
	}
}

func TestListasVaziasNaoQuebram(t *testing.T) {
	svc := transacoes.NewService(&fakeStore{})
	page, _ := svc.Transactions(context.Background(), "u-1", transacoes.TransactionQuery{})
	rules, _ := svc.Recurrences(context.Background(), "u-1")
	debts, _ := svc.FutureDebts(context.Background(), "u-1")
	cats, _ := svc.Categories(context.Background(), "u-1")
	if page.Items == nil || len(page.Items) != 0 || rules == nil || len(rules) != 0 || debts == nil || len(debts) != 0 || cats == nil || len(cats) != 0 {
		t.Errorf("listas vazias devem ser slice não-nil (items=%v rules=%v debts=%v cats=%v)", page.Items, rules, debts, cats)
	}
}

func TestPropagaErroDoStore(t *testing.T) {
	svc := transacoes.NewService(&fakeStore{err: errors.New("falha no banco")})
	if _, err := svc.CashflowSummary(context.Background(), "u-1", time.Now()); err == nil {
		t.Error("CashflowSummary: esperava erro propagado")
	}
	if _, err := svc.Transactions(context.Background(), "u-1", transacoes.TransactionQuery{}); err == nil {
		t.Error("Transactions: esperava erro propagado")
	}
	if _, err := svc.Categories(context.Background(), "u-1"); err == nil {
		t.Error("Categories: esperava erro propagado")
	}
	if _, err := svc.Recurrences(context.Background(), "u-1"); err == nil {
		t.Error("Recurrences: esperava erro propagado")
	}
	if _, err := svc.FutureDebts(context.Background(), "u-1"); err == nil {
		t.Error("FutureDebts: esperava erro propagado")
	}
}
