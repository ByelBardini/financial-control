// Package router monta o http.Handler raiz da API, conectando os handlers de cada domínio.
package router

import (
	"net/http"

	"financial-control/server/internal/account"
	"financial-control/server/internal/dashboard"
	"financial-control/server/internal/health"
	"financial-control/server/internal/httpx"
)

// Deps reúne os serviços de domínio que os handlers precisam (injeção por parâmetro).
type Deps struct {
	Account   *account.Service
	Dashboard *dashboard.Service
}

// New devolve o roteador com todas as rotas registradas.
//
//	srv := &http.Server{Handler: router.New(deps)}
func New(d Deps) http.Handler {
	mux := http.NewServeMux()
	mux.Handle("GET /health", health.Handler())
	mux.Handle("GET /accounts", account.ListHandler(d.Account))
	mux.Handle("GET /dashboard/summary", dashboard.SummaryHandler(d.Dashboard))
	mux.Handle("GET /dashboard/categories", dashboard.CategoriesHandler(d.Dashboard))
	mux.Handle("GET /dashboard/este-mes", dashboard.EsteMesHandler(d.Dashboard))
	mux.Handle("GET /dashboard/diagnosis", dashboard.DiagnosisHandler(d.Dashboard))
	mux.Handle("GET /investments", dashboard.InvestmentsHandler(d.Dashboard))
	mux.Handle("GET /dashboard/investments-summary", dashboard.InvestmentsSummaryHandler(d.Dashboard))
	mux.Handle("GET /dashboard/ticker", dashboard.TickerHandler(d.Dashboard))
	return httpx.CORS(mux)
}
