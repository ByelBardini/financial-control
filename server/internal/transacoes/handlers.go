package transacoes

import (
	"context"
	"log"
	"net/http"
	"strconv"
	"time"

	"financial-control/server/internal/auth"
	"financial-control/server/internal/httpx"
)

// parseMonth interpreta ?month=YYYY-MM; vazio = mês corrente (relógio do server).
// Mesma regra do dashboard/parseMonth.
func parseMonth(q string) (time.Time, error) {
	if q == "" {
		now := time.Now()
		return time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC), nil
	}
	return time.Parse("2006-01", q)
}

// SummaryHandler responde GET /transacoes/summary com o resumo de fluxo do mês (aceita
// ?month=YYYY-MM; default = mês corrente). userID vem do token (middleware), nunca do client.
func SummaryHandler(svc *Service) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := auth.UserIDFromContext(r.Context())
		if !ok {
			httpx.WriteError(w, http.StatusUnauthorized, "não autenticado")
			return
		}
		month, err := parseMonth(r.URL.Query().Get("month"))
		if err != nil {
			httpx.WriteError(w, http.StatusBadRequest, "month inválido, use o formato YYYY-MM")
			return
		}
		out, err := svc.CashflowSummary(r.Context(), userID, month)
		if err != nil {
			log.Printf("GET /transacoes/summary: %v", err)
			httpx.WriteError(w, http.StatusInternalServerError, "erro ao montar o resumo de fluxo")
			return
		}
		httpx.WriteJSON(w, http.StatusOK, out)
	})
}

// listHandler centraliza auth + chamada + resposta JSON pros GETs de lista (sem month).
func listHandler(label string, fn func(context.Context, string) (any, error)) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := auth.UserIDFromContext(r.Context())
		if !ok {
			httpx.WriteError(w, http.StatusUnauthorized, "não autenticado")
			return
		}
		out, err := fn(r.Context(), userID)
		if err != nil {
			log.Printf("GET %s: %v", label, err)
			httpx.WriteError(w, http.StatusInternalServerError, "erro ao montar "+label)
			return
		}
		httpx.WriteJSON(w, http.StatusOK, out)
	})
}

// ListHandler responde GET /transacoes/list com uma página filtrada do log. Aceita
// ?period=30d|3m|6m|1y|custom (default 30d), ?from=&to= (YYYY-MM-DD, p/ custom), ?category=<id>
// (repetível → OR), ?q=<busca>, ?page=N (1-based; default/inválido → 1). Filtros são lenientes
// (period/data desconhecidos caem no default 30d / sem teto; categoria inválida é ignorada).
func ListHandler(svc *Service) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := auth.UserIDFromContext(r.Context())
		if !ok {
			httpx.WriteError(w, http.StatusUnauthorized, "não autenticado")
			return
		}
		qs := r.URL.Query()
		query := TransactionQuery{
			Period:      qs.Get("period"),
			CategoryIDs: qs["category"], // repetível: ?category=c1&category=c2
			Query:       qs.Get("q"),
			From:        qs.Get("from"),
			To:          qs.Get("to"),
			Page:        atoiOr(qs.Get("page"), 1),
		}
		out, err := svc.Transactions(r.Context(), userID, query)
		if err != nil {
			log.Printf("GET /transacoes/list: %v", err)
			httpx.WriteError(w, http.StatusInternalServerError, "erro ao montar as transações")
			return
		}
		httpx.WriteJSON(w, http.StatusOK, out)
	})
}

// atoiOr lê um inteiro do texto; vazio ou inválido devolve def (params de query lenientes).
func atoiOr(s string, def int) int {
	if n, err := strconv.Atoi(s); err == nil {
		return n
	}
	return def
}

// CategoriesHandler responde GET /categories com as categorias ativas do usuário.
func CategoriesHandler(svc *Service) http.Handler {
	return listHandler("as categorias", func(ctx context.Context, userID string) (any, error) {
		return svc.Categories(ctx, userID)
	})
}

// RecurrencesHandler responde GET /transacoes/recurrences com as recorrências ativas.
func RecurrencesHandler(svc *Service) http.Handler {
	return listHandler("as recorrências", func(ctx context.Context, userID string) (any, error) {
		return svc.Recurrences(ctx, userID)
	})
}

// DebtsHandler responde GET /transacoes/debts com as compras parceladas (dívidas futuras).
func DebtsHandler(svc *Service) http.Handler {
	return listHandler("as dívidas", func(ctx context.Context, userID string) (any, error) {
		return svc.FutureDebts(ctx, userID)
	})
}
