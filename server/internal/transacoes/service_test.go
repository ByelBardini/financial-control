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
}

func (f *fakeStore) GetMonthSummary(_ context.Context, userID string, _ time.Time) (store.MonthSummaryRow, error) {
	f.gotUserID = userID
	return f.summary, f.err
}

func (f *fakeStore) ListRecentTransactions(_ context.Context, userID string) ([]store.TransactionRow, error) {
	f.gotUserID = userID
	return f.txns, f.err
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
	fake := &fakeStore{txns: []store.TransactionRow{
		{ID: "t1", OccurredOn: occurred, Description: "iFood", AccountName: "Nubank", CategoryName: "Alimentação", CategoryIcon: "fastfood", Direction: "expense", AmountCents: 8990},
		{ID: "t2", OccurredOn: occurred, Description: "Salário", AccountName: "Nubank", CategoryName: "Salário", CategoryIcon: "payments", Direction: "income", AmountCents: 320000},
	}}
	got, err := transacoes.NewService(fake).Transactions(context.Background(), "u-9")
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if fake.gotUserID != "u-9" {
		t.Errorf("escopo: userID = %q, quero u-9", fake.gotUserID)
	}
	want0 := transacoes.Transaction{
		ID: "t1", DateLabel: "12 JUN", TimeLabel: "12/06", Title: "iFood", AccountLabel: "Nubank",
		Category: "Alimentação", Tag: "Sobrevivência", TagTone: "error", AmountCents: 8990,
		Direction: "outflow", Icon: "fastfood",
	}
	if got[0] != want0 {
		t.Errorf("got[0] = %+v\nquero    %+v", got[0], want0)
	}
	if got[1].Direction != "inflow" || got[1].Tag != "Inflow Esperado" || got[1].TagTone != "secondary" {
		t.Errorf("receita = {%q,%q,%q}, quero {inflow,Inflow Esperado,secondary}", got[1].Direction, got[1].Tag, got[1].TagTone)
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
	txns, _ := svc.Transactions(context.Background(), "u-1")
	rules, _ := svc.Recurrences(context.Background(), "u-1")
	debts, _ := svc.FutureDebts(context.Background(), "u-1")
	if txns == nil || len(txns) != 0 || rules == nil || len(rules) != 0 || debts == nil || len(debts) != 0 {
		t.Errorf("listas vazias devem ser slice não-nil (txns=%v rules=%v debts=%v)", txns, rules, debts)
	}
}

func TestPropagaErroDoStore(t *testing.T) {
	svc := transacoes.NewService(&fakeStore{err: errors.New("falha no banco")})
	if _, err := svc.CashflowSummary(context.Background(), "u-1", time.Now()); err == nil {
		t.Error("CashflowSummary: esperava erro propagado")
	}
	if _, err := svc.Transactions(context.Background(), "u-1"); err == nil {
		t.Error("Transactions: esperava erro propagado")
	}
	if _, err := svc.Recurrences(context.Background(), "u-1"); err == nil {
		t.Error("Recurrences: esperava erro propagado")
	}
	if _, err := svc.FutureDebts(context.Background(), "u-1"); err == nil {
		t.Error("FutureDebts: esperava erro propagado")
	}
}
