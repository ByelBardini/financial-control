// Package router monta o http.Handler raiz da API, conectando os handlers de cada domínio.
package router

import (
	"net/http"
	"time"

	"financial-control/server/internal/account"
	"financial-control/server/internal/auth"
	"financial-control/server/internal/contas"
	"financial-control/server/internal/dashboard"
	"financial-control/server/internal/health"
	"financial-control/server/internal/httpx"
	"financial-control/server/internal/investimentos"
	"financial-control/server/internal/patrimonio"
	"financial-control/server/internal/ratelimit"
	"financial-control/server/internal/transacoes"
)

// loginRateBurst e loginRateWindow definem o freio anti-força-bruta do login:
// até loginRateBurst tentativas por IP, recarregando ao longo de loginRateWindow.
const (
	loginRateBurst  = 5
	loginRateWindow = time.Minute
)

// Deps reúne os serviços de domínio que os handlers precisam (injeção por parâmetro).
type Deps struct {
	Auth          *auth.Service
	Account       *account.Service
	Dashboard     *dashboard.Service
	Contas        *contas.Service
	Transacoes    *transacoes.Service
	Investimentos *investimentos.Service
	Patrimonio    *patrimonio.Service
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

	// Recurso "contas" (CRUD): leitura (lista do dashboard) + detalhe + escrita.
	mux.Handle("GET /accounts", protected(account.ListHandler(d.Account)))
	mux.Handle("GET /accounts/{id}", protected(account.GetHandler(d.Account)))
	mux.Handle("POST /accounts", protected(account.CreateHandler(d.Account)))
	mux.Handle("PATCH /accounts/{id}", protected(account.UpdateHandler(d.Account)))
	mux.Handle("DELETE /accounts/{id}", protected(account.ArchiveHandler(d.Account)))

	mux.Handle("GET /dashboard/summary", protected(dashboard.SummaryHandler(d.Dashboard)))
	mux.Handle("GET /dashboard/categories", protected(dashboard.CategoriesHandler(d.Dashboard)))
	mux.Handle("GET /dashboard/este-mes", protected(dashboard.EsteMesHandler(d.Dashboard)))
	mux.Handle("GET /dashboard/diagnosis", protected(dashboard.DiagnosisHandler(d.Dashboard)))
	mux.Handle("GET /investments", protected(dashboard.InvestmentsHandler(d.Dashboard)))
	mux.Handle("GET /dashboard/investments-summary", protected(dashboard.InvestmentsSummaryHandler(d.Dashboard)))

	// Patrimônio: o saldo líquido (bancos + espécie) + blocos à parte — fonte única do
	// "quanto eu tenho hoje", consumida pela Início e pela tela de Contas (conciliam).
	mux.Handle("GET /patrimonio/overview", protected(patrimonio.OverviewHandler(d.Patrimonio)))

	// Views agregadas da tela de Contas.
	mux.Handle("GET /contas/banks", protected(contas.BanksHandler(d.Contas)))
	mux.Handle("GET /contas/cards", protected(contas.CardsHandler(d.Contas)))
	mux.Handle("GET /contas/vouchers", protected(contas.VouchersHandler(d.Contas)))
	mux.Handle("GET /contas/cash", protected(contas.CashHandler(d.Contas)))
	mux.Handle("GET /contas/xray", protected(contas.XrayHandler(d.Contas)))
	mux.Handle("GET /contas/tip", protected(contas.TipHandler(d.Contas)))

	// Views agregadas da tela de Transações.
	mux.Handle("GET /transacoes/summary", protected(transacoes.SummaryHandler(d.Transacoes)))
	mux.Handle("GET /transacoes/list", protected(transacoes.ListHandler(d.Transacoes)))
	mux.Handle("GET /transacoes/recurrences", protected(transacoes.RecurrencesHandler(d.Transacoes)))
	mux.Handle("GET /transacoes/debts", protected(transacoes.DebtsHandler(d.Transacoes)))
	mux.Handle("GET /categories", protected(transacoes.CategoriesHandler(d.Transacoes)))

	// Views agregadas da tela de Investimentos (cripto à parte do portfólio geral).
	mux.Handle("GET /investimentos/summary", protected(investimentos.SummaryHandler(d.Investimentos)))
	mux.Handle("GET /investimentos/positions", protected(investimentos.PositionsHandler(d.Investimentos)))
	mux.Handle("GET /investimentos/allocation", protected(investimentos.AllocationHandler(d.Investimentos)))
	mux.Handle("GET /investimentos/crypto", protected(investimentos.CryptoHandler(d.Investimentos)))
	mux.Handle("GET /investimentos/evolution", protected(investimentos.EvolutionHandler(d.Investimentos)))
	mux.Handle("GET /investimentos/catalogo", protected(investimentos.CatalogoHandler(d.Investimentos)))
	mux.Handle("POST /investimentos/backfill", protected(investimentos.BackfillHandler(d.Investimentos)))

	// Recurso "investimentos" (CRUD): ativos + operações (compra/venda). Posição é derivada,
	// então a escrita reflete nas views sem cache. Carteira isolada (não mexe no saldo das contas).
	mux.Handle("GET /investimentos/assets", protected(investimentos.AssetsHandler(d.Investimentos)))
	mux.Handle("POST /investimentos/assets", protected(investimentos.CreateAssetHandler(d.Investimentos)))
	mux.Handle("GET /investimentos/assets/{id}", protected(investimentos.GetAssetHandler(d.Investimentos)))
	mux.Handle("GET /investimentos/assets/{id}/history", protected(investimentos.PriceHistoryHandler(d.Investimentos)))
	mux.Handle("PATCH /investimentos/assets/{id}", protected(investimentos.UpdateAssetHandler(d.Investimentos)))
	mux.Handle("DELETE /investimentos/assets/{id}", protected(investimentos.ArchiveAssetHandler(d.Investimentos)))
	mux.Handle("POST /investimentos/assets/{id}/trades", protected(investimentos.TradeHandler(d.Investimentos)))
	mux.Handle("DELETE /investimentos/assets/{id}/trades/{tradeId}", protected(investimentos.DeleteTradeHandler(d.Investimentos)))

	// Recurso "transações" (CRUD): saldo é derivado, então a escrita reflete no mês/saldo.
	mux.Handle("POST /transactions", protected(transacoes.CreateHandler(d.Transacoes)))
	mux.Handle("POST /transactions/installment-purchases", protected(transacoes.CreateInstallmentHandler(d.Transacoes)))
	mux.Handle("POST /recurring-rules", protected(transacoes.CreateRecurringRuleHandler(d.Transacoes)))
	mux.Handle("POST /recurring-rules/{id}/register", protected(transacoes.RegisterRecurrenceHandler(d.Transacoes)))
	mux.Handle("GET /transactions/{id}", protected(transacoes.GetTransactionHandler(d.Transacoes)))
	mux.Handle("PATCH /transactions/{id}", protected(transacoes.UpdateHandler(d.Transacoes)))
	mux.Handle("DELETE /transactions/{id}", protected(transacoes.DeleteHandler(d.Transacoes)))

	return httpx.CORS(mux)
}
