package contas_test

import (
	"context"
	"errors"
	"testing"

	"financial-control/server/internal/contas"
	"financial-control/server/internal/store"
)

// fakeContasStore é o fake nomeado da dependência de dados (sem banco). Captura o
// userID recebido pra provar o escopo por usuário em cada query.
type fakeContasStore struct {
	banks     []store.BankAccountRow
	vouchers  []store.VoucherRow
	cash      int64
	credits   []store.CreditAccountRow
	err       error
	gotUserID string
}

func (f *fakeContasStore) ListBankAccounts(_ context.Context, userID string) ([]store.BankAccountRow, error) {
	f.gotUserID = userID
	return f.banks, f.err
}

func (f *fakeContasStore) ListVoucherAccounts(_ context.Context, userID string) ([]store.VoucherRow, error) {
	f.gotUserID = userID
	return f.vouchers, f.err
}

func (f *fakeContasStore) GetCashBalance(_ context.Context, userID string) (int64, error) {
	f.gotUserID = userID
	return f.cash, f.err
}

func (f *fakeContasStore) ListCreditAccounts(_ context.Context, userID string) ([]store.CreditAccountRow, error) {
	f.gotUserID = userID
	return f.credits, f.err
}

func TestBanksMapeiaBrandColorENotaDerivada(t *testing.T) {
	fake := &fakeContasStore{banks: []store.BankAccountRow{
		{ID: "a1", Name: "Nubank", Subtitle: "Conta Corrente • Final 4022", BalanceCents: 84220, Icon: "account_balance_wallet", Tone: "primary", DotColor: "#8a05be"},
		{ID: "a2", Name: "Itaú", Subtitle: "Conta Salário", BalanceCents: 0, Icon: "corporate_fare", Tone: "neutral", DotColor: "#004990"},
	}}
	got, err := contas.NewService(fake).Banks(context.Background(), "u-1")
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if fake.gotUserID != "u-1" {
		t.Errorf("store recebeu userID %q, quero u-1 (escopo)", fake.gotUserID)
	}
	want0 := contas.BankAccount{
		ID: "a1", Name: "Nubank", Subtitle: "Conta Corrente • Final 4022", BalanceCents: 84220,
		Icon: "account_balance_wallet", BrandColor: "#8a05be", Note: "Sincronizado. Infelizmente", NoteTone: "secondary",
	}
	if got[0] != want0 {
		t.Errorf("got[0] = %+v, quero %+v", got[0], want0)
	}
	if got[1].Note != "Vazio como minha alma" || got[1].NoteTone != "error" {
		t.Errorf("conta zerada = (%q,%q), quero (Vazio como minha alma,error)", got[1].Note, got[1].NoteTone)
	}
	if got[1].BrandColor != "#004990" {
		t.Errorf("brandColor de got[1] = %q, quero #004990", got[1].BrandColor)
	}
}

func TestVouchersDerivaRemainingStatusEValor(t *testing.T) {
	fake := &fakeContasStore{vouchers: []store.VoucherRow{
		{ID: "v1", Name: "Alelo", BalanceCents: 21500, GrantedCents: 21500, Icon: "restaurant"},
		{ID: "v2", Name: "Ticket", BalanceCents: 1230, GrantedCents: 61500, Icon: "shopping_basket"},
	}}
	got, err := contas.NewService(fake).Vouchers(context.Background(), "u-1")
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if got[0].RemainingPercent != 100 || got[0].Status != "ativo" || got[0].ValueCents != 21500 {
		t.Errorf("vale cheio = {%d,%q,%d}, quero {100,ativo,21500}", got[0].RemainingPercent, got[0].Status, got[0].ValueCents)
	}
	if got[1].RemainingPercent != 2 || got[1].Status != "critico" || got[1].Note != "Socorro, cadê o RH?" {
		t.Errorf("vale vazio = {%d,%q,%q}, quero {2,critico,Socorro, cadê o RH?}", got[1].RemainingPercent, got[1].Status, got[1].Note)
	}
}

func TestCashDerivaQuipEConfianca(t *testing.T) {
	got, err := contas.NewService(&fakeContasStore{cash: 12230}).Cash(context.Background(), "u-1")
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	want := contas.CashWallet{
		BalanceCents: 12230, Quip: "Notas amassadas e moedas que o caixa não quis.",
		ConfidenceLabel: "Confiança Financeira", ConfidencePercent: 1,
	}
	if got != want {
		t.Errorf("got = %+v, quero %+v", got, want)
	}
}

func TestXrayAgregaDividaLimiteEPanic(t *testing.T) {
	fake := &fakeContasStore{credits: []store.CreditAccountRow{
		{Name: "Nubank Cartão", BalanceCents: -420000, LimitCents: 500000},
		{Name: "Inter Cartão", BalanceCents: 1000, LimitCents: 200000}, // saldo positivo não vira dívida
	}}
	got, err := contas.NewService(fake).Xray(context.Background(), "u-1")
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if got.Title != "Raio-X de Pobreza" {
		t.Errorf("title = %q", got.Title)
	}
	if got.Rows[0].Cents != 420000 || got.Rows[0].Tone != "error" {
		t.Errorf("dívida = {%d,%q}, quero {420000,error}", got.Rows[0].Cents, got.Rows[0].Tone)
	}
	if got.Rows[1].Cents != 280000 { // limite 700000 - dívida 420000
		t.Errorf("disponível = %d, quero 280000", got.Rows[1].Cents)
	}
	if got.Panic.Percent != 60 || got.Panic.LevelLabel != "Atenção" { // 420000/700000 = 60%
		t.Errorf("panic = {%d,%q}, quero {60,Atenção}", got.Panic.Percent, got.Panic.LevelLabel)
	}
}

func TestCardsDerivaFaturaDisponivelEUso(t *testing.T) {
	fake := &fakeContasStore{credits: []store.CreditAccountRow{
		{ID: "c1", Name: "Nubank Roxinho", BalanceCents: -32000, LimitCents: 150000, Icon: "credit_card", DotColor: "#8a05be"},
		{ID: "c2", Name: "Itaú Click", BalanceCents: 1000, LimitCents: 200000, Icon: "credit_card", DotColor: "#004990"},   // saldo positivo → fatura 0
		{ID: "c3", Name: "Estourado", BalanceCents: -250000, LimitCents: 200000, Icon: "credit_card", DotColor: "#e63946"}, // dívida > limite → disponível clampa em 0, uso 100
	}}
	got, err := contas.NewService(fake).Cards(context.Background(), "u-1")
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if fake.gotUserID != "u-1" {
		t.Errorf("store recebeu userID %q, quero u-1 (escopo)", fake.gotUserID)
	}
	want0 := contas.CreditCard{
		ID: "c1", Name: "Nubank Roxinho", InvoiceCents: 32000, LimitCents: 150000,
		AvailableCents: 118000, UsedPercent: 21, Icon: "credit_card", BrandColor: "#8a05be",
		Note: "Ainda fingindo controle", NoteTone: "secondary",
	}
	if got[0] != want0 {
		t.Errorf("got[0] = %+v, quero %+v", got[0], want0)
	}
	if got[1].InvoiceCents != 0 || got[1].AvailableCents != 200000 || got[1].UsedPercent != 0 {
		t.Errorf("cartão sem dívida = {fatura %d, disp %d, uso %d}, quero {0,200000,0}", got[1].InvoiceCents, got[1].AvailableCents, got[1].UsedPercent)
	}
	if got[2].AvailableCents != 0 || got[2].UsedPercent != 100 || got[2].NoteTone != "error" {
		t.Errorf("cartão estourado = {disp %d, uso %d, tom %q}, quero {0,100,error}", got[2].AvailableCents, got[2].UsedPercent, got[2].NoteTone)
	}
}

func TestListasVaziasNaoQuebram(t *testing.T) {
	svc := contas.NewService(&fakeContasStore{})
	banks, _ := svc.Banks(context.Background(), "u-1")
	vouchers, _ := svc.Vouchers(context.Background(), "u-1")
	cards, _ := svc.Cards(context.Background(), "u-1")
	if banks == nil || len(banks) != 0 || vouchers == nil || len(vouchers) != 0 || cards == nil || len(cards) != 0 {
		t.Errorf("listas vazias devem ser slice não-nil (banks=%v vouchers=%v cards=%v)", banks, vouchers, cards)
	}
}

func TestCashVaziaDerivaQuip(t *testing.T) {
	got, err := contas.NewService(&fakeContasStore{cash: 0}).Cash(context.Background(), "u-1")
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	want := contas.CashWallet{
		BalanceCents: 0, Quip: "Nem moeda de 5 centavos sobrou.",
		ConfidenceLabel: "Confiança Financeira", ConfidencePercent: 0,
	}
	if got != want {
		t.Errorf("carteira vazia = %+v, quero %+v", got, want)
	}
}

func TestPropagaErroDoStore(t *testing.T) {
	svc := contas.NewService(&fakeContasStore{err: errors.New("falha no banco")})
	if _, err := svc.Banks(context.Background(), "u-1"); err == nil {
		t.Error("Banks: esperava erro propagado")
	}
	if _, err := svc.Vouchers(context.Background(), "u-1"); err == nil {
		t.Error("Vouchers: esperava erro propagado")
	}
	if _, err := svc.Cards(context.Background(), "u-1"); err == nil {
		t.Error("Cards: esperava erro propagado")
	}
	if _, err := svc.Cash(context.Background(), "u-1"); err == nil {
		t.Error("Cash: esperava erro propagado")
	}
	if _, err := svc.Xray(context.Background(), "u-1"); err == nil {
		t.Error("Xray: esperava erro propagado")
	}
}

func TestTipTextoFixo(t *testing.T) {
	got := contas.NewService(&fakeContasStore{}).Tip()
	if got.Title != "Dica de Gestão" || got.Body == "" {
		t.Errorf("tip = %+v", got)
	}
}
