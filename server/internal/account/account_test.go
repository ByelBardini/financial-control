package account_test

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"financial-control/server/internal/account"
	"financial-control/server/internal/store"
)

// fakeAccountStore é o fake nomeado da dependência de dados (sem banco real).
type fakeAccountStore struct {
	rows []store.AccountRow
	err  error
}

func (f *fakeAccountStore) ListAccountsWithBalance(context.Context) ([]store.AccountRow, error) {
	return f.rows, f.err
}

func TestListHandlerDevolveContasEmJSON(t *testing.T) {
	fake := &fakeAccountStore{rows: []store.AccountRow{
		{ID: "a1", Name: "Nubank", BalanceCents: 84220, Icon: "credit_card", Tone: "primary", DotColor: "#d0bcff"},
	}}

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/accounts", nil)
	account.ListHandler(account.NewService(fake)).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, quero %d", rec.Code, http.StatusOK)
	}
	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Fatalf("Content-Type = %q, quero application/json", ct)
	}
	const want = `[{"id":"a1","name":"Nubank","balanceCents":84220,"icon":"credit_card","tone":"primary","dotColor":"#d0bcff"}]` + "\n"
	if got := rec.Body.String(); got != want {
		t.Fatalf("body = %q, quero %q", got, want)
	}
}

func TestListHandlerListaVaziaDevolveArrayJSON(t *testing.T) {
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/accounts", nil)
	account.ListHandler(account.NewService(&fakeAccountStore{rows: []store.AccountRow{}})).ServeHTTP(rec, req)

	if got := rec.Body.String(); got != "[]\n" {
		t.Fatalf("body = %q, quero %q (lista vazia deve virar [] e não null)", got, "[]\n")
	}
}

func TestListHandlerErroDoStoreDevolve500(t *testing.T) {
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/accounts", nil)
	account.ListHandler(account.NewService(&fakeAccountStore{err: errors.New("falha no banco")})).ServeHTTP(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, quero %d", rec.Code, http.StatusInternalServerError)
	}
}
