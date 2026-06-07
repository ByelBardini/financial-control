package auth_test

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"financial-control/server/internal/auth"
)

// fakeAuthenticator scripta o resultado do Authenticate pro middleware.
type fakeAuthenticator struct {
	user auth.User
	err  error
}

func (f fakeAuthenticator) Authenticate(context.Context, string) (auth.User, error) {
	return f.user, f.err
}

// TestRequireAuthParsingDoHeader cobre o parsing do `Authorization`: esquema
// errado / token ausente / grudado → 401 sem chamar next (fail-closed); prefixo
// "Bearer" case-insensitive e espaços aparados → segue pro handler. Tabela porque
// o que muda entre os casos é só o header de entrada.
func TestRequireAuthParsingDoHeader(t *testing.T) {
	cases := []struct {
		name     string
		header   string // "" = sem header
		wantNext bool
	}{
		{"sem header", "", false},
		{"esquema Token", "Token abc", false},
		{"esquema Basic", "Basic abc", false},
		{"Bearer sem espaço", "Bearer", false},
		{"Bearer sem token", "Bearer ", false},
		{"Bearer só espaços", "Bearer    ", false},
		{"Bearer grudado", "Bearertoken", false},
		{"Bearer válido", "Bearer tok", true},
		{"prefixo minúsculo (EqualFold)", "bearer tok", true},
		{"prefixo maiúsculo (EqualFold)", "BEARER tok", true},
		{"espaços extras aparados", "Bearer    tok", true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			called := false
			next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				called = true
				w.WriteHeader(http.StatusOK)
			})
			h := auth.RequireAuth(fakeAuthenticator{user: auth.User{ID: "u-1"}}, next)

			rec := httptest.NewRecorder()
			req := httptest.NewRequest(http.MethodGet, "/accounts", nil)
			if tc.header != "" {
				req.Header.Set("Authorization", tc.header)
			}
			h.ServeHTTP(rec, req)

			if called != tc.wantNext {
				t.Fatalf("next chamado = %v, quero %v", called, tc.wantNext)
			}
			wantCode := http.StatusUnauthorized
			if tc.wantNext {
				wantCode = http.StatusOK
			}
			if rec.Code != wantCode {
				t.Fatalf("status = %d, quero %d", rec.Code, wantCode)
			}
		})
	}
}

func TestRequireAuthAuthenticateFalha401(t *testing.T) {
	h := auth.RequireAuth(
		fakeAuthenticator{err: errors.New("token inválido/expirado/inativo")},
		http.HandlerFunc(func(http.ResponseWriter, *http.Request) { t.Fatal("não deveria chamar next") }),
	)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/accounts", nil)
	req.Header.Set("Authorization", "Bearer qualquer")
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, quero 401", rec.Code)
	}
}

func TestRequireAuthValidoInjetaUserID(t *testing.T) {
	var gotID string
	var gotOK bool
	next := http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
		gotID, gotOK = auth.UserIDFromContext(r.Context())
	})
	h := auth.RequireAuth(fakeAuthenticator{user: auth.User{ID: "u-42"}}, next)

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/accounts", nil)
	req.Header.Set("Authorization", "Bearer valido")
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, quero 200", rec.Code)
	}
	if !gotOK || gotID != "u-42" {
		t.Fatalf("userID no ctx = %q ok=%v, quero u-42", gotID, gotOK)
	}
}
