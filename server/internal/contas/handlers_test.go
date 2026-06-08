package contas_test

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"financial-control/server/internal/auth"
	"financial-control/server/internal/contas"
	"financial-control/server/internal/store"
)

// errStore é o erro fake do store nos testes de handler (falha → 500).
var errStore = errors.New("falha no banco")

// do dispara um GET já autenticado (userID no contexto, como o middleware faria).
func do(t *testing.T, h http.Handler, target string) *httptest.ResponseRecorder {
	t.Helper()
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, target, nil)
	req = req.WithContext(auth.WithUserID(req.Context(), "u-1"))
	h.ServeHTTP(rec, req)
	return rec
}

func assertJSON(t *testing.T, rec *httptest.ResponseRecorder, want string) {
	t.Helper()
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, quero 200", rec.Code)
	}
	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Fatalf("Content-Type = %q", ct)
	}
	if got := rec.Body.String(); got != want+"\n" {
		t.Fatalf("body =\n%q\nquero\n%q", got, want+"\n")
	}
}

func TestBanksHandlerJSON(t *testing.T) {
	svc := contas.NewService(&fakeContasStore{banks: []store.BankAccountRow{
		{ID: "a1", Name: "Nubank", Subtitle: "Conta Corrente • Final 4022", BalanceCents: 84220, Icon: "account_balance_wallet", Tone: "primary", DotColor: "#8a05be"},
	}})
	assertJSON(t, do(t, contas.BanksHandler(svc), "/contas/banks"),
		`[{"id":"a1","name":"Nubank","subtitle":"Conta Corrente • Final 4022","balanceCents":84220,"icon":"account_balance_wallet","brandColor":"#8a05be","note":"Sincronizado. Infelizmente","noteTone":"secondary"}]`)
}

func TestBanksHandlerListaVaziaArrayJSON(t *testing.T) {
	svc := contas.NewService(&fakeContasStore{banks: []store.BankAccountRow{}})
	if got := do(t, contas.BanksHandler(svc), "/contas/banks").Body.String(); got != "[]\n" {
		t.Fatalf("body = %q, quero [] (lista vazia não pode virar null)", got)
	}
}

func TestVouchersHandlerJSON(t *testing.T) {
	svc := contas.NewService(&fakeContasStore{vouchers: []store.VoucherRow{
		{ID: "v1", Name: "Alelo", BalanceCents: 21500, GrantedCents: 21500, Icon: "restaurant"},
	}})
	assertJSON(t, do(t, contas.VouchersHandler(svc), "/contas/vouchers"),
		`[{"id":"v1","name":"Alelo","valueCents":21500,"icon":"restaurant","status":"ativo","remainingPercent":100,"note":"Ainda dá pra almoçar fora","noteTone":"secondary"}]`)
}

func TestCashHandlerJSON(t *testing.T) {
	svc := contas.NewService(&fakeContasStore{cash: 12230})
	assertJSON(t, do(t, contas.CashHandler(svc), "/contas/cash"),
		`{"balanceCents":12230,"quip":"Notas amassadas e moedas que o caixa não quis.","confidenceLabel":"Confiança Financeira","confidencePercent":1}`)
}

func TestCardsHandlerJSON(t *testing.T) {
	svc := contas.NewService(&fakeContasStore{credits: []store.CreditAccountRow{
		{ID: "c1", Name: "Nubank Roxinho", BalanceCents: -32000, LimitCents: 150000, Icon: "credit_card", DotColor: "#8a05be"},
	}})
	assertJSON(t, do(t, contas.CardsHandler(svc), "/contas/cards"),
		`[{"id":"c1","name":"Nubank Roxinho","invoiceCents":32000,"limitCents":150000,"availableCents":118000,"usedPercent":21,"icon":"credit_card","brandColor":"#8a05be","note":"Ainda fingindo controle","noteTone":"secondary"}]`)
}

func TestCardsHandlerListaVaziaArrayJSON(t *testing.T) {
	svc := contas.NewService(&fakeContasStore{credits: []store.CreditAccountRow{}})
	if got := do(t, contas.CardsHandler(svc), "/contas/cards").Body.String(); got != "[]\n" {
		t.Fatalf("body = %q, quero [] (lista vazia não pode virar null)", got)
	}
}

func TestXrayHandlerJSON(t *testing.T) {
	svc := contas.NewService(&fakeContasStore{credits: []store.CreditAccountRow{
		{Name: "Cartão", BalanceCents: -420000, LimitCents: 500000},
	}})
	assertJSON(t, do(t, contas.XrayHandler(svc), "/contas/xray"),
		`{"title":"Raio-X de Pobreza","rows":[{"label":"Dívidas no cartão","cents":420000,"tone":"error"},{"label":"Limite disponível","cents":80000,"tone":"neutral"}],"panic":{"percent":84,"levelLabel":"Crítico","levelTone":"error","lowLabel":"Tranquilo","highLabel":"Colapso","note":"Falência iminente. Esconda o cartão."}}`)
}

func TestTipHandlerJSON(t *testing.T) {
	svc := contas.NewService(&fakeContasStore{})
	assertJSON(t, do(t, contas.TipHandler(svc), "/contas/tip"),
		`{"title":"Dica de Gestão","body":"Se você não abrir o app do banco, o saldo tecnicamente pode ser infinito. Efeito Schrödinger Financeiro."}`)
}

func TestHandlerSemUsuario401(t *testing.T) {
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/contas/banks", nil) // sem userID no contexto
	contas.BanksHandler(contas.NewService(&fakeContasStore{})).ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, quero 401 (sem usuário no contexto)", rec.Code)
	}
}

func TestHandlerErroDoStore500(t *testing.T) {
	svc := contas.NewService(&fakeContasStore{err: errStore})
	rec := do(t, contas.BanksHandler(svc), "/contas/banks")
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, quero 500", rec.Code)
	}
}
