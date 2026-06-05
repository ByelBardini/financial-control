package health_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"financial-control/server/internal/health"
)

func TestHandlerRespondeOK(t *testing.T) {
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/health", nil)

	health.Handler().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, quero %d", rec.Code, http.StatusOK)
	}

	const wantBody = "{\"status\":\"ok\"}\n"
	if got := rec.Body.String(); got != wantBody {
		t.Fatalf("body = %q, quero %q", got, wantBody)
	}

	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Fatalf("Content-Type = %q, quero application/json", ct)
	}
}
