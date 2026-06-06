// Package test reúne os testes de integração/e2e da API, exercitando o roteador
// real por HTTP. Testes unitários ficam ao lado de cada pacote em internal/.
package test

import (
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"financial-control/server/internal/router"
)

func TestHealthEndpointE2E(t *testing.T) {
	srv := httptest.NewServer(router.New(router.Deps{}))
	defer srv.Close()

	res, err := http.Get(srv.URL + "/health")
	if err != nil {
		t.Fatalf("GET /health falhou: %v", err)
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, quero %d", res.StatusCode, http.StatusOK)
	}

	body, err := io.ReadAll(res.Body)
	if err != nil {
		t.Fatalf("leitura do body falhou: %v", err)
	}

	const wantBody = "{\"status\":\"ok\"}\n"
	if got := string(body); got != wantBody {
		t.Fatalf("body = %q, quero %q", got, wantBody)
	}
}
