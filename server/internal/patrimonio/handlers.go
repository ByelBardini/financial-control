package patrimonio

import (
	"log"
	"net/http"

	"financial-control/server/internal/auth"
	"financial-control/server/internal/httpx"
)

// OverviewHandler responde GET /patrimonio/overview com a quebra do patrimônio do usuário.
// O userID vem do token (via middleware) — nunca do client; sem ele responde 401 (defensivo:
// a rota deveria estar atrás do RequireAuth).
func OverviewHandler(svc *Service) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := auth.UserIDFromContext(r.Context())
		if !ok {
			httpx.WriteError(w, http.StatusUnauthorized, "não autenticado")
			return
		}
		out, err := svc.Overview(r.Context(), userID)
		if err != nil {
			log.Printf("GET /patrimonio/overview: %v", err)
			httpx.WriteError(w, http.StatusInternalServerError, "erro ao montar /patrimonio/overview")
			return
		}
		httpx.WriteJSON(w, http.StatusOK, out)
	})
}
