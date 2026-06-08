package router_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"financial-control/server/internal/account"
	"financial-control/server/internal/auth"
	"financial-control/server/internal/contas"
	"financial-control/server/internal/dashboard"
	"financial-control/server/internal/router"
)

// newTestRouter monta o router com serviços "vazios". Sem token o RequireAuth
// barra a requisição ANTES de tocar nos serviços, então o store nil nunca roda.
func newTestRouter() http.Handler {
	authSvc := auth.NewService(nil, auth.NewTokenIssuer("router-test-secret-0123456789-01"), auth.TTLs{})
	return router.New(router.Deps{
		Auth:      authSvc,
		Account:   account.NewService(nil),
		Dashboard: dashboard.NewService(nil),
		Contas:    contas.NewService(nil),
	})
}

// Invariante de segurança: TODA rota de dados (inclusive os stubs) responde 401
// sem token. Esse teste falha se alguém adicionar uma rota sem o RequireAuth.
func TestRotasDeDadosExigemToken(t *testing.T) {
	h := newTestRouter()
	dataPaths := []string{
		"/accounts",
		"/dashboard/summary",
		"/dashboard/categories",
		"/dashboard/este-mes",
		"/dashboard/diagnosis",
		"/investments",
		"/dashboard/investments-summary",
		"/dashboard/ticker",
		"/auth/me",
		"/accounts/a1",
		"/contas/banks",
		"/contas/cards",
		"/contas/vouchers",
		"/contas/cash",
		"/contas/xray",
		"/contas/tip",
	}
	for _, p := range dataPaths {
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, p, nil)) // sem Authorization
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("GET %s sem token = %d, quero 401", p, rec.Code)
		}
	}
}

// As rotas de escrita de conta (CRUD) também exigem token.
func TestRotasDeEscritaExigemToken(t *testing.T) {
	h := newTestRouter()
	cases := []struct{ method, path string }{
		{http.MethodPost, "/accounts"},
		{http.MethodPatch, "/accounts/a1"},
		{http.MethodDelete, "/accounts/a1"},
	}
	for _, c := range cases {
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, httptest.NewRequest(c.method, c.path, nil)) // sem Authorization
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("%s %s sem token = %d, quero 401", c.method, c.path, rec.Code)
		}
	}
}

func TestHealthEhPublico(t *testing.T) {
	rec := httptest.NewRecorder()
	newTestRouter().ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/health", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("GET /health = %d, quero 200 (público)", rec.Code)
	}
}

func TestLoginEhPublico(t *testing.T) {
	// Público: não passa pelo RequireAuth. Corpo vazio dá 400 (não 401).
	rec := httptest.NewRecorder()
	newTestRouter().ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/auth/login", nil))
	if rec.Code == http.StatusUnauthorized {
		t.Fatalf("POST /auth/login deu 401 — não deveria passar pelo RequireAuth")
	}
}

// Invariante de segurança: o login freia força-bruta por IP. A 1ª tentativa passa
// (login legítimo não é barrado); martelar o mesmo IP vira 429 (sem chegar no
// handler); outro IP tem bucket próprio. Corpo nil → 400 nas permitidas.
func TestLoginRateLimitPorIP(t *testing.T) {
	h := newTestRouter()
	post := func(ip string) int {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodPost, "/auth/login", nil)
		req.RemoteAddr = ip + ":40000"
		h.ServeHTTP(rec, req)
		return rec.Code
	}

	if post("203.0.113.9") == http.StatusTooManyRequests {
		t.Fatal("a 1ª tentativa não pode ser limitada (login legítimo)")
	}
	limited := false
	for i := 0; i < 50 && !limited; i++ {
		limited = post("203.0.113.9") == http.StatusTooManyRequests
	}
	if !limited {
		t.Fatal("martelar o mesmo IP deveria virar 429")
	}
	if post("198.51.100.2") == http.StatusTooManyRequests {
		t.Fatal("outro IP tem bucket próprio — não pode herdar o 429 do primeiro")
	}
}
