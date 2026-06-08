package contas

import (
	"context"
	"log"
	"net/http"

	"financial-control/server/internal/auth"
	"financial-control/server/internal/httpx"
)

// userHandler centraliza o user autenticado, a chamada ao service e a resposta JSON.
// O userID vem do token (via middleware) — nunca do client; sem ele responde 401
// (defensivo: a rota deveria estar atrás do RequireAuth).
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

// BanksHandler responde GET /contas/banks com as contas de banco.
func BanksHandler(svc *Service) http.Handler {
	return userHandler("/contas/banks", func(ctx context.Context, userID string) (any, error) {
		return svc.Banks(ctx, userID)
	})
}

// CardsHandler responde GET /contas/cards com os cartões de crédito (por item).
func CardsHandler(svc *Service) http.Handler {
	return userHandler("/contas/cards", func(ctx context.Context, userID string) (any, error) {
		return svc.Cards(ctx, userID)
	})
}

// VouchersHandler responde GET /contas/vouchers com os vales.
func VouchersHandler(svc *Service) http.Handler {
	return userHandler("/contas/vouchers", func(ctx context.Context, userID string) (any, error) {
		return svc.Vouchers(ctx, userID)
	})
}

// CashHandler responde GET /contas/cash com a carteira física.
func CashHandler(svc *Service) http.Handler {
	return userHandler("/contas/cash", func(ctx context.Context, userID string) (any, error) {
		return svc.Cash(ctx, userID)
	})
}

// XrayHandler responde GET /contas/xray com o Raio-X de Pobreza.
func XrayHandler(svc *Service) http.Handler {
	return userHandler("/contas/xray", func(ctx context.Context, userID string) (any, error) {
		return svc.Xray(ctx, userID)
	})
}

// TipHandler responde GET /contas/tip com a dica de gestão (texto fixo derivado).
func TipHandler(svc *Service) http.Handler {
	return userHandler("/contas/tip", func(_ context.Context, _ string) (any, error) {
		return svc.Tip(), nil
	})
}
