package auth

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// TokenIssuer emite e verifica JWTs HS256 com o segredo do server. O algoritmo é
// FIXADO em HS256 na verificação (rejeita alg:none e confusão RS/HS). Claims:
// sub (id do usuário), iat e exp.
type TokenIssuer struct {
	secret []byte
}

// NewTokenIssuer cria o emissor a partir do segredo (já validado no config.Load).
func NewTokenIssuer(secret string) *TokenIssuer {
	return &TokenIssuer{secret: []byte(secret)}
}

// Issue assina um token pro userID, válido por ttl a partir de now. `now` é
// parâmetro (não time.Now interno) pra deixar a expiração testável.
func (t *TokenIssuer) Issue(userID string, now time.Time, ttl time.Duration) (string, error) {
	claims := jwt.RegisteredClaims{
		Subject:   userID,
		IssuedAt:  jwt.NewNumericDate(now),
		ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
	}
	signed, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(t.secret)
	if err != nil {
		return "", fmt.Errorf("auth: assinar token: %w", err)
	}
	return signed, nil
}

// Parse valida assinatura, algoritmo e expiração; devolve o id do usuário (sub).
// Qualquer falha (assinatura, alg, expirado, sem sub) vira erro — o middleware
// trata como 401.
func (t *TokenIssuer) Parse(tokenString string) (string, error) {
	claims := &jwt.RegisteredClaims{}
	_, err := jwt.ParseWithClaims(
		tokenString,
		claims,
		func(*jwt.Token) (any, error) { return t.secret, nil },
		jwt.WithValidMethods([]string{"HS256"}),
	)
	if err != nil {
		return "", fmt.Errorf("auth: token inválido: %w", err)
	}
	if claims.Subject == "" {
		return "", fmt.Errorf("auth: token sem subject")
	}
	return claims.Subject, nil
}
