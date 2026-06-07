// Package router monta o http.Handler raiz da API, conectando os handlers de cada domínio.
package router

import (
	"net/http"
	"time"

	"financial-control/server/internal/account"
	"financial-control/server/internal/auth"
	"financial-control/server/internal/dashboard"
	"financial-control/server/internal/health"
	"financial-control/server/internal/httpx"
	"financial-control/server/internal/ratelimit"
)

// loginRateBurst e loginRateWindow definem o freio anti-força-bruta do login:
// até loginRateBurst tentativas por IP, recarregando ao longo de loginRateWindow.
const (
	loginRateBurst  = 5
	loginRateWindow = time.Minute
)

// Deps reúne os serviços de domínio que os handlers precisam (injeção por parâmetro).
type Deps struct {
	Auth      *auth.Service
	Account   *account.Service
	Dashboard *dashboard.Service
}

// New devolve o roteador com todas as rotas registradas. Só `GET /health` e
// `POST /auth/login` são públicos; TODA rota de dados (inclusive os stubs) passa
// pelo RequireAuth — assim "esquecer de proteger uma rota" não acontece em silêncio.
//
//	srv := &http.Server{Handler: router.New(deps)}
func New(d Deps) http.Handler {
	mux := http.NewServeMux()

	// Públicas. O login passa pelo rate-limit por IP (anti-força-bruta).
	loginLimiter := ratelimit.New(loginRateBurst, loginRateWindow, time.Now)
	mux.Handle("GET /health", health.Handler())
	mux.Handle("POST /auth/login", loginLimiter.Middleware(ratelimit.ClientIP, auth.LoginHandler(d.Auth)))

	// protected exige token válido (Authorization: Bearer) e injeta o userID no ctx.
	protected := func(h http.Handler) http.Handler { return auth.RequireAuth(d.Auth, h) }

	mux.Handle("GET /auth/me", protected(auth.MeHandler(d.Auth)))
	mux.Handle("GET /accounts", protected(account.ListHandler(d.Account)))
	mux.Handle("GET /dashboard/summary", protected(dashboard.SummaryHandler(d.Dashboard)))
	mux.Handle("GET /dashboard/categories", protected(dashboard.CategoriesHandler(d.Dashboard)))
	mux.Handle("GET /dashboard/este-mes", protected(dashboard.EsteMesHandler(d.Dashboard)))
	mux.Handle("GET /dashboard/diagnosis", protected(dashboard.DiagnosisHandler(d.Dashboard)))
	mux.Handle("GET /investments", protected(dashboard.InvestmentsHandler(d.Dashboard)))
	mux.Handle("GET /dashboard/investments-summary", protected(dashboard.InvestmentsSummaryHandler(d.Dashboard)))
	mux.Handle("GET /dashboard/ticker", protected(dashboard.TickerHandler(d.Dashboard)))

	return httpx.CORS(mux)
}
