package dashboard_test

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"financial-control/server/internal/auth"
	"financial-control/server/internal/dashboard"
	"financial-control/server/internal/store"
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

func TestMonthHandlerSemUsuario401(t *testing.T) {
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/dashboard/summary", nil) // sem userID no contexto
	dashboard.SummaryHandler(dashboard.NewService(&fakeDashStore{})).ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, quero 401 (sem usuário no contexto)", rec.Code)
	}
}

func TestSummaryHandlerJSON(t *testing.T) {
	svc := dashboard.NewService(&fakeDashStore{summary: store.MonthSummaryRow{ReceitasCents: 320000, GastosCents: 111550}})
	rec := do(t, dashboard.SummaryHandler(svc), "/dashboard/summary")

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, quero 200", rec.Code)
	}
	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Fatalf("Content-Type = %q", ct)
	}
	const want = `{"netCents":208450,"availableLabel":"Disponível para gastar","statusLabel":"No controle","quip":"Calma, ainda dá pra sonhar com férias.","receitasCents":320000,"gastosCents":111550,"investidoCents":0}` + "\n"
	if got := rec.Body.String(); got != want {
		t.Fatalf("body =\n%q\nquero\n%q", got, want)
	}
}

func TestCategoriesHandlerListaVazia(t *testing.T) {
	svc := dashboard.NewService(&fakeDashStore{cats: []store.CategorySpendRow{}})
	rec := do(t, dashboard.CategoriesHandler(svc), "/dashboard/categories")
	if got := rec.Body.String(); got != "[]\n" {
		t.Fatalf("body = %q, quero %q", got, "[]\n")
	}
}

func TestEsteMesHandlerJSON(t *testing.T) {
	svc := dashboard.NewService(&fakeDashStore{
		summary: store.MonthSummaryRow{ReceitasCents: 320000, GastosCents: 111550},
		cats:    []store.CategorySpendRow{{Label: "Alimentação", AmountCents: 60000}},
	})
	rec := do(t, dashboard.EsteMesHandler(svc), "/dashboard/este-mes")
	const want = `{"spentPercent":35,"biggestVillain":"Alimentação"}` + "\n"
	if got := rec.Body.String(); got != want {
		t.Fatalf("body = %q, quero %q", got, want)
	}
}

func TestSummaryHandlerMonthInvalido(t *testing.T) {
	svc := dashboard.NewService(&fakeDashStore{})
	rec := do(t, dashboard.SummaryHandler(svc), "/dashboard/summary?month=banana")
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, quero 400", rec.Code)
	}
	const wantBody = `{"error":"month inválido, use o formato YYYY-MM"}` + "\n"
	if got := rec.Body.String(); got != wantBody {
		t.Errorf("body = %q, quero %q", got, wantBody)
	}
}

func TestSummaryHandlerMesForaDoIntervalo(t *testing.T) {
	svc := dashboard.NewService(&fakeDashStore{})
	rec := do(t, dashboard.SummaryHandler(svc), "/dashboard/summary?month=2026-13")
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, quero 400 (mês 13 não existe)", rec.Code)
	}
}

func TestSummaryHandlerMonthValido(t *testing.T) {
	svc := dashboard.NewService(&fakeDashStore{summary: store.MonthSummaryRow{ReceitasCents: 1000}})
	rec := do(t, dashboard.SummaryHandler(svc), "/dashboard/summary?month=2026-06")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, quero 200", rec.Code)
	}
}

func TestSummaryHandlerErroDoStore(t *testing.T) {
	svc := dashboard.NewService(&fakeDashStore{err: errors.New("falha no banco")})
	rec := do(t, dashboard.SummaryHandler(svc), "/dashboard/summary")
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, quero 500", rec.Code)
	}
}

func TestDiagnosisHandlerJSON(t *testing.T) {
	svc := dashboard.NewService(&fakeDashStore{summary: store.MonthSummaryRow{ReceitasCents: 1000, GastosCents: 0}})
	rec := do(t, dashboard.DiagnosisHandler(svc), "/dashboard/diagnosis")
	const want = `{"title":"Diagnóstico Pobrify","body":"Você ainda não está falido. Continue assim."}` + "\n"
	if got := rec.Body.String(); got != want {
		t.Fatalf("body = %q, quero %q", got, want)
	}
}

func TestInvestmentsHandlerListaVazia(t *testing.T) {
	svc := dashboard.NewService(&fakeDashStore{})
	rec := do(t, dashboard.InvestmentsHandler(svc), "/investments")
	if got := rec.Body.String(); got != "[]\n" {
		t.Fatalf("body = %q, quero %q", got, "[]\n")
	}
}

func TestTickerHandlerStub(t *testing.T) {
	svc := dashboard.NewService(&fakeDashStore{})
	rec := do(t, dashboard.TickerHandler(svc), "/dashboard/ticker")
	const want = `{"name":"Bitcoin","symbol":"B","changePct24h":0,"priceCents":0,"positionCents":0}` + "\n"
	if got := rec.Body.String(); got != want {
		t.Fatalf("body = %q, quero %q", got, want)
	}
}

func TestInvestmentsSummaryHandlerZerado(t *testing.T) {
	svc := dashboard.NewService(&fakeDashStore{})
	rec := do(t, dashboard.InvestmentsSummaryHandler(svc), "/dashboard/investments-summary")
	const want = `{"totalCents":0,"changeCents":0,"changePct":0}` + "\n"
	if got := rec.Body.String(); got != want {
		t.Fatalf("body = %q, quero %q", got, want)
	}
}
