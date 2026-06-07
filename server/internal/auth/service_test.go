package auth_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"financial-control/server/internal/auth"
	"financial-control/server/internal/store"
)

// fakeUserStore é o fake nomeado da dependência de dados do auth (sem banco).
type fakeUserStore struct {
	byEmail map[string]store.UserCredentials
	byID    map[string]store.User
}

func (f *fakeUserStore) FindUserByEmail(_ context.Context, email string) (store.UserCredentials, error) {
	u, ok := f.byEmail[email]
	if !ok {
		return store.UserCredentials{}, store.ErrUserNotFound
	}
	return u, nil
}

func (f *fakeUserStore) GetUserByID(_ context.Context, id string) (store.User, error) {
	u, ok := f.byID[id]
	if !ok {
		return store.User{}, store.ErrUserNotFound
	}
	return u, nil
}

func newService(t *testing.T) (*auth.Service, *auth.TokenIssuer, *fakeUserStore) {
	t.Helper()
	hash, err := auth.HashPassword("segredo")
	if err != nil {
		t.Fatalf("HashPassword: %v", err)
	}
	fake := &fakeUserStore{
		byEmail: map[string]store.UserCredentials{
			"ana@x.com": {ID: "u-1", Email: "ana@x.com", PasswordHash: hash, IsActive: true, Name: "Ana"},
		},
		byID: map[string]store.User{
			"u-1": {ID: "u-1", Email: "ana@x.com", IsActive: true, Name: "Ana"},
		},
	}
	iss := auth.NewTokenIssuer(testSecret)
	svc := auth.NewService(fake, iss, auth.TTLs{Default: 24 * time.Hour, Remember: 720 * time.Hour})
	return svc, iss, fake
}

func TestLoginValidoEmiteTokenComSub(t *testing.T) {
	svc, iss, _ := newService(t)
	tok, user, err := svc.Login(context.Background(), "ana@x.com", "segredo", false)
	if err != nil {
		t.Fatalf("Login: %v", err)
	}
	if user.ID != "u-1" || user.Email != "ana@x.com" {
		t.Fatalf("user = %+v", user)
	}
	sub, err := iss.Parse(tok)
	if err != nil || sub != "u-1" {
		t.Fatalf("token sub = %q err = %v, quero u-1", sub, err)
	}
}

func TestLoginEmailInexistenteGenerico(t *testing.T) {
	svc, _, _ := newService(t)
	_, _, err := svc.Login(context.Background(), "naoexiste@x.com", "segredo", false)
	if !errors.Is(err, auth.ErrInvalidCredentials) {
		t.Fatalf("err = %v, quero ErrInvalidCredentials", err)
	}
}

func TestLoginSenhaErradaGenerico(t *testing.T) {
	svc, _, _ := newService(t)
	_, _, err := svc.Login(context.Background(), "ana@x.com", "errada", false)
	if !errors.Is(err, auth.ErrInvalidCredentials) {
		t.Fatalf("err = %v, quero ErrInvalidCredentials", err)
	}
}

func TestLoginContaInativaGenerico(t *testing.T) {
	svc, _, fake := newService(t)
	u := fake.byEmail["ana@x.com"]
	u.IsActive = false
	fake.byEmail["ana@x.com"] = u
	_, _, err := svc.Login(context.Background(), "ana@x.com", "segredo", false)
	if !errors.Is(err, auth.ErrInvalidCredentials) {
		t.Fatalf("err = %v, quero ErrInvalidCredentials (conta inativa)", err)
	}
}

func TestLoginRememberMeAumentaExpiracao(t *testing.T) {
	svc, _, _ := newService(t)
	curto, _, err := svc.Login(context.Background(), "ana@x.com", "segredo", false)
	if err != nil {
		t.Fatalf("login curto: %v", err)
	}
	longo, _, err := svc.Login(context.Background(), "ana@x.com", "segredo", true)
	if err != nil {
		t.Fatalf("login longo: %v", err)
	}
	if expOf(t, curto) >= expOf(t, longo) {
		t.Fatal("rememberMe=true deveria gerar exp maior que rememberMe=false")
	}
}

func TestAuthenticateValidoDevolveUsuario(t *testing.T) {
	svc, iss, _ := newService(t)
	tok, _ := iss.Issue("u-1", time.Now(), time.Hour)
	user, err := svc.Authenticate(context.Background(), tok)
	if err != nil || user.ID != "u-1" {
		t.Fatalf("Authenticate user = %+v err = %v", user, err)
	}
}

func TestAuthenticateUsuarioInativoFalha(t *testing.T) {
	svc, iss, fake := newService(t)
	u := fake.byID["u-1"]
	u.IsActive = false
	fake.byID["u-1"] = u
	tok, _ := iss.Issue("u-1", time.Now(), time.Hour)
	if _, err := svc.Authenticate(context.Background(), tok); err == nil {
		t.Fatal("usuário inativo deveria falhar no Authenticate")
	}
}

// expOf lê o exp (unix) de um token assinado com testSecret.
func expOf(t *testing.T, token string) int64 {
	t.Helper()
	claims := &jwt.RegisteredClaims{}
	if _, err := jwt.ParseWithClaims(token, claims, func(*jwt.Token) (any, error) {
		return []byte(testSecret), nil
	}); err != nil {
		t.Fatalf("parse exp: %v", err)
	}
	return claims.ExpiresAt.Unix()
}
