// Package auth implementa autenticação: hashing de senha (bcrypt), emissão e
// verificação de JWT, login e o middleware que protege as rotas de dados. O id
// do usuário autenticado viaja no context.Context do request (set pelo middleware,
// lido pelos handlers de dados).
package auth

import "context"

// chave privada do context — tipo próprio evita colisão com outras chaves.
type ctxKey struct{}

var userIDKey = ctxKey{}

// WithUserID devolve um ctx derivado carregando o id do usuário autenticado.
func WithUserID(ctx context.Context, userID string) context.Context {
	return context.WithValue(ctx, userIDKey, userID)
}

// UserIDFromContext lê o id do usuário autenticado posto pelo middleware. ok=false
// quando não há (rota não passou pelo RequireAuth) — o handler deve tratar como 401.
func UserIDFromContext(ctx context.Context) (string, bool) {
	userID, ok := ctx.Value(userIDKey).(string)
	if !ok || userID == "" {
		return "", false
	}
	return userID, true
}
