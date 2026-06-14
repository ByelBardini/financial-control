package transacoes_test

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"financial-control/server/internal/auth"
	"financial-control/server/internal/store"
	"financial-control/server/internal/transacoes"
)

// do dispara um GET já autenticado (userID no contexto, como o middleware faria).
func do(t *testing.T, h http.Handler, target string) *httptest.ResponseRecorder {
	t.Helper()
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, target, nil)
	req = req.WithContext(auth.WithUserID(req.Context(), "u-1"))
	h.ServeHTTP(rec, req)
	return rec
}

func TestSummaryHandlerSemUsuario401(t *testing.T) {
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/transacoes/summary", nil) // sem userID no contexto
	transacoes.SummaryHandler(transacoes.NewService(&fakeStore{})).ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, quero 401", rec.Code)
	}
}

func TestSummaryHandlerJSON(t *testing.T) {
	svc := transacoes.NewService(&fakeStore{summary: store.MonthSummaryRow{ReceitasCents: 320000, GastosCents: 111550}})
	rec := do(t, transacoes.SummaryHandler(svc), "/transacoes/summary")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, quero 200", rec.Code)
	}
	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Fatalf("Content-Type = %q", ct)
	}
	const want = `{"inflowCents":320000,"outflowCents":111550,"netBurnCents":208450,"burnPercent":35,"collapse":{"percent":35,"levelLabel":"30 Dias","levelTone":"secondary","lowLabel":"Tranquilo","highLabel":"Colapso","note":"Dá pra respirar. Por enquanto."}}` + "\n"
	if got := rec.Body.String(); got != want {
		t.Fatalf("body =\n%q\nquero\n%q", got, want)
	}
}

func TestSummaryHandlerMonthInvalido(t *testing.T) {
	svc := transacoes.NewService(&fakeStore{})
	rec := do(t, transacoes.SummaryHandler(svc), "/transacoes/summary?month=banana")
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, quero 400", rec.Code)
	}
	const wantBody = `{"error":"month inválido, use o formato YYYY-MM"}` + "\n"
	if got := rec.Body.String(); got != wantBody {
		t.Errorf("body = %q, quero %q", got, wantBody)
	}
}

func TestSummaryHandlerErroDoStore(t *testing.T) {
	svc := transacoes.NewService(&fakeStore{err: errors.New("falha no banco")})
	rec := do(t, transacoes.SummaryHandler(svc), "/transacoes/summary")
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, quero 500", rec.Code)
	}
}

func TestListHandlerJSON(t *testing.T) {
	occurred := time.Date(2026, 6, 12, 0, 0, 0, 0, time.UTC)
	svc := transacoes.NewService(&fakeStore{txns: []store.TransactionRow{
		{ID: "t1", OccurredOn: occurred, Description: "iFood", AccountName: "Nubank", CategoryName: "Alimentação", CategoryIcon: "fastfood", Direction: "expense", AmountCents: 8990},
	}})
	rec := do(t, transacoes.ListHandler(svc), "/transacoes/list")
	const want = `[{"id":"t1","dateLabel":"12 JUN","timeLabel":"12/06","title":"iFood","accountLabel":"Nubank","category":"Alimentação","tag":"Sobrevivência","tagTone":"error","amountCents":8990,"direction":"outflow","icon":"fastfood"}]` + "\n"
	if got := rec.Body.String(); got != want {
		t.Fatalf("body =\n%q\nquero\n%q", got, want)
	}
}

func TestListHandlerListaVazia(t *testing.T) {
	svc := transacoes.NewService(&fakeStore{})
	rec := do(t, transacoes.ListHandler(svc), "/transacoes/list")
	if got := rec.Body.String(); got != "[]\n" {
		t.Fatalf("body = %q, quero %q", got, "[]\n")
	}
}

func TestRecurrencesHandlerListaVazia(t *testing.T) {
	svc := transacoes.NewService(&fakeStore{})
	rec := do(t, transacoes.RecurrencesHandler(svc), "/transacoes/recurrences")
	if got := rec.Body.String(); got != "[]\n" {
		t.Fatalf("body = %q, quero %q", got, "[]\n")
	}
}

func TestDebtsHandlerJSON(t *testing.T) {
	svc := transacoes.NewService(&fakeStore{debts: []store.InstallmentDebtRow{
		{GroupID: "g1", Description: "Fone (1/3)", InstallmentTotal: 3, InstallmentsPaid: 2, InstallmentCents: 10000, CategoryIcon: "headphones"},
	}})
	rec := do(t, transacoes.DebtsHandler(svc), "/transacoes/debts")
	const want = `[{"id":"g1","label":"Fone","installmentLabel":"Parcela 2/3","amountCents":10000,"percent":67,"tone":"primary","icon":"headphones","note":"Decisão financeira questionável."}]` + "\n"
	if got := rec.Body.String(); got != want {
		t.Fatalf("body =\n%q\nquero\n%q", got, want)
	}
}
