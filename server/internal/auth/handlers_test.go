package auth_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"financial-control/server/internal/auth"
)

// fakeLoginService scripta a resposta do Login pro LoginHandler.
type fakeLoginService struct {
	token string
	user  auth.User
	err   error
}

func (f fakeLoginService) Login(context.Context, string, string, bool) (string, auth.User, error) {
	return f.token, f.user, f.err
}

func TestLoginHandlerSucesso(t *testing.T) {
	svc := fakeLoginService{token: "tok-123", user: auth.User{ID: "u-1", Email: "ana@x.com", Name: "Ana"}}
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/auth/login",
		strings.NewReader(`{"email":"ana@x.com","password":"segredo","rememberMe":true}`))
	auth.LoginHandler(svc).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, quero 200", rec.Code)
	}
	const want = `{"token":"tok-123","user":{"id":"u-1","email":"ana@x.com","name":"Ana"}}` + "\n"
	if got := rec.Body.String(); got != want {
		t.Fatalf("body = %q, quero %q", got, want)
	}
}

func TestLoginHandlerCredencialInvalida401Generico(t *testing.T) {
	// Falhas diferentes (e-mail inexistente vs senha errada) devem dar corpo+status
	// IDÊNTICOS — senão a resposta denuncia se o e-mail existe.
	bodies := make([]string, 0, 2)
	for _, in := range []string{`{"email":"x@x.com","password":"a"}`, `{"email":"y@y.com","password":"b"}`} {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodPost, "/auth/login", strings.NewReader(in))
		auth.LoginHandler(fakeLoginService{err: auth.ErrInvalidCredentials}).ServeHTTP(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("status = %d, quero 401", rec.Code)
		}
		bodies = append(bodies, rec.Body.String())
	}
	if bodies[0] != bodies[1] {
		t.Fatalf("corpos diferentes entre falhas (%q vs %q) — vaza se o e-mail existe", bodies[0], bodies[1])
	}
}

func TestLoginHandlerCorpoInvalido400(t *testing.T) {
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/auth/login", strings.NewReader(`{quebrado`))
	auth.LoginHandler(fakeLoginService{}).ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, quero 400", rec.Code)
	}
}

// fakeMeService scripta o UserByID pro MeHandler.
type fakeMeService struct {
	user auth.User
	err  error
}

func (f fakeMeService) UserByID(context.Context, string) (auth.User, error) { return f.user, f.err }

func TestMeHandlerComContextoDevolveUsuario(t *testing.T) {
	svc := fakeMeService{user: auth.User{ID: "u-1", Email: "ana@x.com", Name: "Ana"}}
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/auth/me", nil)
	req = req.WithContext(auth.WithUserID(req.Context(), "u-1"))
	auth.MeHandler(svc).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, quero 200", rec.Code)
	}
	const want = `{"id":"u-1","email":"ana@x.com","name":"Ana"}` + "\n"
	if got := rec.Body.String(); got != want {
		t.Fatalf("body = %q, quero %q", got, want)
	}
}

func TestMeHandlerSemContexto401(t *testing.T) {
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/auth/me", nil)
	auth.MeHandler(fakeMeService{}).ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, quero 401", rec.Code)
	}
}
