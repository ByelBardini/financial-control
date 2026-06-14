package transacoes

import (
	"context"
	"log"
	"net/http"
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

// ListHandler responde GET /transacoes/list com o log de transações recentes.
func ListHandler(svc *Service) http.Handler {
	return listHandler("as transações", func(ctx context.Context, userID string) (any, error) {
		return svc.Transactions(ctx, userID)
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
