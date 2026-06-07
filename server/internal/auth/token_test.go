package auth_test

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"financial-control/server/internal/auth"
)

const testSecret = "test-secret-0123456789-0123456789"

func TestTokenIssueParseRoundTrip(t *testing.T) {
	iss := auth.NewTokenIssuer(testSecret)
	tok, err := iss.Issue("user-123", time.Now(), time.Hour)
	if err != nil {
		t.Fatalf("Issue: %v", err)
	}
	sub, err := iss.Parse(tok)
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	if sub != "user-123" {
		t.Fatalf("sub = %q, quero user-123", sub)
	}
}

// TestParseRejeitaTokensInvalidos junta numa tabela tudo que o Parse precisa
// recusar — expiração, assinatura/segredo errado, alg:none e confusão de método
// (HS384), subject vazio e string que nem é JWT. Cada caso vira um token que o
// MESMO emissor (testSecret) precisa rejeitar.
func TestParseRejeitaTokensInvalidos(t *testing.T) {
	iss := auth.NewTokenIssuer(testSecret)
	sign := func(method jwt.SigningMethod, key any, claims jwt.Claims) string {
		t.Helper()
		s, err := jwt.NewWithClaims(method, claims).SignedString(key)
		if err != nil {
			t.Fatalf("assinar token de teste: %v", err)
		}
		return s
	}
	validExp := jwt.NewNumericDate(time.Now().Add(time.Hour))

	none, err := jwt.NewWithClaims(jwt.SigningMethodNone,
		jwt.RegisteredClaims{Subject: "u", ExpiresAt: validExp}).SignedString(jwt.UnsafeAllowNoneSignatureType)
	if err != nil {
		t.Fatalf("forjar alg:none: %v", err)
	}

	cases := []struct {
		name  string
		token string
	}{
		{"expirado", sign(jwt.SigningMethodHS256, []byte(testSecret),
			jwt.RegisteredClaims{Subject: "u", ExpiresAt: jwt.NewNumericDate(time.Now().Add(-time.Hour))})},
		{"segredo errado", sign(jwt.SigningMethodHS256, []byte("outro-segredo-aaaaaaaaaaaaaaaaaaaaaa"),
			jwt.RegisteredClaims{Subject: "u", ExpiresAt: validExp})},
		{"alg none", none},
		{"método HS384 (confusão de alg)", sign(jwt.SigningMethodHS384, []byte(testSecret),
			jwt.RegisteredClaims{Subject: "u", ExpiresAt: validExp})},
		{"sem subject", sign(jwt.SigningMethodHS256, []byte(testSecret),
			jwt.RegisteredClaims{ExpiresAt: validExp})},
		{"lixo (não é jwt)", "isso.nao.e-jwt"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if _, err := iss.Parse(tc.token); err == nil {
				t.Fatalf("%q deveria falhar no Parse", tc.name)
			}
		})
	}
}
