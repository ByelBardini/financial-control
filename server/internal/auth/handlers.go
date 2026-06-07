package auth

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"financial-control/server/internal/httpx"
)

// loginRequest é o corpo de POST /auth/login (rememberMe controla o TTL do token).
type loginRequest struct {
	Email      string `json:"email"`
	Password   string `json:"password"`
	RememberMe bool   `json:"rememberMe"`
}

// loginResponse é a resposta de POST /auth/login.
type loginResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

// loginService é a fatia do Service que o LoginHandler usa.
type loginService interface {
	Login(ctx context.Context, email, password string, rememberMe bool) (string, User, error)
}

// LoginHandler responde POST /auth/login: valida as credenciais e devolve token +
// usuário. Credencial inválida → 401 genérico (mesmo corpo pra e-mail/senha/inativo).
// Corpo malformado → 400.
func LoginHandler(svc loginService) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req loginRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			httpx.WriteError(w, http.StatusBadRequest, "corpo inválido")
			return
		}
		token, user, err := svc.Login(r.Context(), req.Email, req.Password, req.RememberMe)
		if errors.Is(err, ErrInvalidCredentials) {
			httpx.WriteError(w, http.StatusUnauthorized, "credenciais inválidas")
			return
		}
		if err != nil {
			log.Printf("POST /auth/login: %v", err)
			httpx.WriteError(w, http.StatusInternalServerError, "erro ao autenticar")
			return
		}
		httpx.WriteJSON(w, http.StatusOK, loginResponse{Token: token, User: user})
	})
}

// meService é a fatia do Service que o MeHandler usa.
type meService interface {
	UserByID(ctx context.Context, userID string) (User, error)
}

// MeHandler responde GET /auth/me com o usuário atual. Roda atrás do RequireAuth,
// então o id vem do contexto; sem ele responde 401 (defensivo).
func MeHandler(svc meService) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := UserIDFromContext(r.Context())
		if !ok {
			httpx.WriteError(w, http.StatusUnauthorized, "não autenticado")
			return
		}
		user, err := svc.UserByID(r.Context(), userID)
		if err != nil {
			log.Printf("GET /auth/me: %v", err)
			httpx.WriteError(w, http.StatusInternalServerError, "erro ao carregar usuário")
			return
		}
		httpx.WriteJSON(w, http.StatusOK, user)
	})
}
