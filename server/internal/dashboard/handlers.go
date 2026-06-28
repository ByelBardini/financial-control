package dashboard

import (
	"context"
	"log"
	"net/http"
	"time"

	"financial-control/server/internal/auth"
	"financial-control/server/internal/httpx"
)

// parseMonth interpreta ?month=YYYY-MM; vazio = mês corrente (relógio do server).
func parseMonth(q string) (time.Time, error) {
	if q == "" {
		now := time.Now()
		return time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC), nil
	}
	return time.Parse("2006-01", q)
}

// monthHandler centraliza o user autenticado, o parse do mês, a chamada ao
// service e a resposta JSON. O userID vem do token (via middleware) — nunca do
// client; sem ele responde 401 (defensivo: a rota deveria estar atrás do RequireAuth).
func monthHandler(label string, fn func(context.Context, string, time.Time) (any, error)) http.Handler {
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
		out, err := fn(r.Context(), userID, month)
		if err != nil {
			log.Printf("GET %s: %v", label, err)
			httpx.WriteError(w, http.StatusInternalServerError, "erro ao montar "+label)
			return
		}
		httpx.WriteJSON(w, http.StatusOK, out)
	})
}

// SummaryHandler responde GET /dashboard/summary com o resumo do mês.
func SummaryHandler(svc *Service) http.Handler {
	return monthHandler("o resumo do mês", func(ctx context.Context, userID string, m time.Time) (any, error) {
		return svc.MonthBalance(ctx, userID, m)
	})
}

// CategoriesHandler responde GET /dashboard/categories com o gasto por categoria.
func CategoriesHandler(svc *Service) http.Handler {
	return monthHandler("as categorias", func(ctx context.Context, userID string, m time.Time) (any, error) {
		return svc.Categories(ctx, userID, m)
	})
}

// EsteMesHandler responde GET /dashboard/este-mes com o panorama do mês.
func EsteMesHandler(svc *Service) http.Handler {
	return monthHandler("o panorama do mês", func(ctx context.Context, userID string, m time.Time) (any, error) {
		return svc.EsteMes(ctx, userID, m)
	})
}

// DiagnosisHandler responde GET /dashboard/diagnosis com o cartão de diagnóstico.
func DiagnosisHandler(svc *Service) http.Handler {
	return monthHandler("o diagnóstico", func(ctx context.Context, userID string, m time.Time) (any, error) {
		return svc.Diagnosis(ctx, userID, m)
	})
}

// userHandler centraliza o user autenticado (do token), a chamada ao service e a resposta JSON,
// para visões que não dependem do mês (ex.: carteira de investimentos). Sem userID → 401.
func userHandler(label string, fn func(context.Context, string) (any, error)) http.Handler {
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

// InvestmentsHandler responde GET /investments com a carteira do usuário (posições abertas).
func InvestmentsHandler(svc *Service) http.Handler {
	return userHandler("os investimentos", func(ctx context.Context, userID string) (any, error) {
		return svc.Investments(ctx, userID)
	})
}

// InvestmentsSummaryHandler responde GET /dashboard/investments-summary com o resumo da carteira.
func InvestmentsSummaryHandler(svc *Service) http.Handler {
	return userHandler("o resumo dos investimentos", func(ctx context.Context, userID string) (any, error) {
		return svc.InvestmentsSummary(ctx, userID)
	})
}
