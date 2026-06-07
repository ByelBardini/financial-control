package auth

import (
	"context"
	"net/http"
	"strings"

	"financial-control/server/internal/httpx"
)

// authenticator é a fatia do Service que o middleware precisa (facilita o fake no teste).
type authenticator interface {
	Authenticate(ctx context.Context, token string) (User, error)
}

// RequireAuth protege um handler: exige `Authorization: Bearer <token>` válido
// (assinatura, expiração e usuário ativo). Qualquer falha = 401 genérico e o next
// NÃO é chamado (fail-closed). Em sucesso injeta o id do usuário no contexto.
//
//	mux.Handle("GET /accounts", auth.RequireAuth(authSvc, account.ListHandler(svc)))
func RequireAuth(a authenticator, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token, ok := bearerToken(r.Header.Get("Authorization"))
		if !ok {
			unauthorized(w)
			return
		}
		user, err := a.Authenticate(r.Context(), token)
		if err != nil {
			unauthorized(w)
			return
		}
		next.ServeHTTP(w, r.WithContext(WithUserID(r.Context(), user.ID)))
	})
}

// bearerToken extrai o token do header "Bearer <token>"; ok=false se ausente/malformado.
func bearerToken(header string) (string, bool) {
	const prefix = "Bearer "
	if len(header) <= len(prefix) || !strings.EqualFold(header[:len(prefix)], prefix) {
		return "", false
	}
	token := strings.TrimSpace(header[len(prefix):])
	return token, token != ""
}

func unauthorized(w http.ResponseWriter) {
	httpx.WriteError(w, http.StatusUnauthorized, "não autenticado")
}
