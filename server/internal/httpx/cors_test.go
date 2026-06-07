package httpx_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"financial-control/server/internal/httpx"
)

func TestCORSAdicionaHeaderEChamaInner(t *testing.T) {
	called := false
	inner := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		called = true
		_, _ = w.Write([]byte("ok"))
	})

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/accounts", nil)
	httpx.CORS(inner).ServeHTTP(rec, req)

	if !called {
		t.Fatal("handler interno não foi chamado no GET")
	}
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "*" {
		t.Fatalf("Access-Control-Allow-Origin = %q, quero *", got)
	}
	if rec.Body.String() != "ok" {
		t.Fatalf("body = %q, quero ok", rec.Body.String())
	}
}

func TestCORSPreflightOPTIONSResponde204SemChamarInner(t *testing.T) {
	called := false
	inner := http.HandlerFunc(func(http.ResponseWriter, *http.Request) { called = true })

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodOptions, "/accounts", nil)
	httpx.CORS(inner).ServeHTTP(rec, req)

	if called {
		t.Fatal("handler interno não devia ser chamado no preflight OPTIONS")
	}
	if rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d, quero 204", rec.Code)
	}
	if rec.Header().Get("Access-Control-Allow-Methods") == "" {
		t.Fatal("faltou Access-Control-Allow-Methods no preflight")
	}
}

func TestCORSLiberaPOSTeAuthorization(t *testing.T) {
	// Login é POST com header Authorization nas demais rotas — o preflight precisa liberar ambos.
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodOptions, "/auth/login", nil)
	httpx.CORS(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {})).ServeHTTP(rec, req)

	if methods := rec.Header().Get("Access-Control-Allow-Methods"); !strings.Contains(methods, "POST") {
		t.Fatalf("Allow-Methods = %q, faltou POST", methods)
	}
	if headers := rec.Header().Get("Access-Control-Allow-Headers"); !strings.Contains(headers, "Authorization") {
		t.Fatalf("Allow-Headers = %q, faltou Authorization", headers)
	}
}

func TestCORSRespeitaOrigemConfigurada(t *testing.T) {
	t.Setenv("CORS_ALLOW_ORIGIN", "http://localhost:8081")

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	httpx.CORS(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {})).ServeHTTP(rec, req)

	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:8081" {
		t.Fatalf("Access-Control-Allow-Origin = %q, quero a origem configurada", got)
	}
}
