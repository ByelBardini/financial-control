// Package router monta o http.Handler raiz da API, conectando os handlers de cada domínio.
package router

import (
	"net/http"

	"financial-control/server/internal/health"
)

// New devolve o roteador com todas as rotas registradas.
//
//	srv := &http.Server{Handler: router.New()}
func New() http.Handler {
	mux := http.NewServeMux()
	mux.Handle("GET /health", health.Handler())
	return mux
}
