package account_test

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"financial-control/server/internal/account"
	"financial-control/server/internal/auth"
	"financial-control/server/internal/store"
)

// fakeAccountStore é o fake nomeado da dependência de dados (sem banco real).
// Captura o userID/id/input recebidos pra provar escopo por usuário e mapeamento.
type fakeAccountStore struct {
	rows      []store.AccountRow
	err       error
	gotUserID string

	// CRUD
	detail     store.AccountDetail // devolvido por GetAccountByID (resposta de create/update)
	newID      string
	createErr  error
	updateErr  error
	archiveErr error
	getErr     error
	gotID      string
	gotInput   store.AccountInput
}

func (f *fakeAccountStore) ListAccountsWithBalance(_ context.Context, userID string) ([]store.AccountRow, error) {
	f.gotUserID = userID
	return f.rows, f.err
}

func (f *fakeAccountStore) CreateAccount(_ context.Context, userID string, in store.AccountInput) (string, error) {
	f.gotUserID = userID
	f.gotInput = in
	return f.newID, f.createErr
}

func (f *fakeAccountStore) UpdateAccount(_ context.Context, userID, id string, in store.AccountInput) error {
	f.gotUserID = userID
	f.gotID = id
	f.gotInput = in
	return f.updateErr
}

func (f *fakeAccountStore) ArchiveAccount(_ context.Context, userID, id string) error {
	f.gotUserID = userID
	f.gotID = id
	return f.archiveErr
}

func (f *fakeAccountStore) GetAccountByID(_ context.Context, userID, id string) (store.AccountDetail, error) {
	f.gotUserID = userID
	f.gotID = id
	return f.detail, f.getErr
}

// authed cria um GET já autenticado (userID no contexto, como o middleware faria).
func authed(target, userID string) *http.Request {
	req := httptest.NewRequest(http.MethodGet, target, nil)
	return req.WithContext(auth.WithUserID(req.Context(), userID))
}

func TestListHandlerDevolveContasEmJSONEEscopaPorUsuario(t *testing.T) {
	fake := &fakeAccountStore{rows: []store.AccountRow{
		{ID: "a1", Name: "Nubank", AccountType: "checking", BalanceCents: 84220, Icon: "credit_card", Tone: "primary", DotColor: "#d0bcff"},
	}}

	rec := httptest.NewRecorder()
	account.ListHandler(account.NewService(fake)).ServeHTTP(rec, authed("/accounts", "u-7"))

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, quero %d", rec.Code, http.StatusOK)
	}
	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Fatalf("Content-Type = %q, quero application/json", ct)
	}
	const want = `[{"id":"a1","name":"Nubank","accountType":"checking","balanceCents":84220,"icon":"credit_card","tone":"primary","dotColor":"#d0bcff"}]` + "\n"
	if got := rec.Body.String(); got != want {
		t.Fatalf("body = %q, quero %q", got, want)
	}
	if fake.gotUserID != "u-7" {
		t.Fatalf("store recebeu userID %q, quero u-7 (escopo por usuário)", fake.gotUserID)
	}
}

func TestListHandlerListaVaziaDevolveArrayJSON(t *testing.T) {
	rec := httptest.NewRecorder()
	account.ListHandler(account.NewService(&fakeAccountStore{rows: []store.AccountRow{}})).
		ServeHTTP(rec, authed("/accounts", "u-1"))

	if got := rec.Body.String(); got != "[]\n" {
		t.Fatalf("body = %q, quero %q (lista vazia deve virar [] e não null)", got, "[]\n")
	}
}

func TestListHandlerErroDoStoreDevolve500(t *testing.T) {
	rec := httptest.NewRecorder()
	account.ListHandler(account.NewService(&fakeAccountStore{err: errors.New("falha no banco")})).
		ServeHTTP(rec, authed("/accounts", "u-1"))

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, quero %d", rec.Code, http.StatusInternalServerError)
	}
}

func TestListHandlerSemUsuario401(t *testing.T) {
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/accounts", nil) // sem userID no contexto
	account.ListHandler(account.NewService(&fakeAccountStore{})).ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, quero 401 (sem usuário no contexto)", rec.Code)
	}
}
