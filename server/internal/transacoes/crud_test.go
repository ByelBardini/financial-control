package transacoes_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"financial-control/server/internal/auth"
	"financial-control/server/internal/store"
	"financial-control/server/internal/transacoes"
)

// doJSON dispara uma requisição já autenticada, com corpo e (opcional) path value {id}.
func doJSON(t *testing.T, h http.Handler, method, target, body, id string) *httptest.ResponseRecorder {
	t.Helper()
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(method, target, strings.NewReader(body))
	req = req.WithContext(auth.WithUserID(req.Context(), "u-1"))
	if id != "" {
		req.SetPathValue("id", id)
	}
	h.ServeHTTP(rec, req)
	return rec
}

// detailRow é a transação que o store devolve após criar/editar/buscar (fixa pro golden).
func detailRow() store.TransactionDetailRow {
	return store.TransactionDetailRow{
		ID: "t1", AccountID: "a1", CategoryID: "c1", Description: "Mercado",
		Direction: "expense", AmountCents: 62000,
		OccurredOn:  time.Date(2026, 6, 5, 0, 0, 0, 0, time.UTC),
		AccountName: "Nubank", CategoryName: "Alimentação", CategoryIcon: "restaurant",
	}
}

const validCreateBody = `{"accountId":"a1","categoryId":"c1","description":"Mercado","direction":"outflow","amountCents":62000,"occurredOn":"2026-06-05"}`

func TestCreateHandler201ELabelMapeada(t *testing.T) {
	fake := &fakeStore{createID: "t1", detail: detailRow()}
	rec := doJSON(t, transacoes.CreateHandler(transacoes.NewService(fake)), http.MethodPost, "/transactions", validCreateBody, "")
	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, quero 201", rec.Code)
	}
	const want = `{"id":"t1","accountId":"a1","categoryId":"c1","description":"Mercado","direction":"outflow","amountCents":62000,"occurredOn":"2026-06-05","accountLabel":"Nubank","category":"Alimentação","icon":"restaurant"}` + "\n"
	if got := rec.Body.String(); got != want {
		t.Fatalf("body =\n%q\nquero\n%q", got, want)
	}
	// O sentido do client (outflow) é mapeado pro banco (expense) antes de gravar.
	if fake.gotInput.Direction != "expense" || fake.gotInput.AccountID != "a1" {
		t.Errorf("store recebeu {dir %q, acc %q}, quero {expense, a1}", fake.gotInput.Direction, fake.gotInput.AccountID)
	}
}

func TestCreateHandlerValidacao400(t *testing.T) {
	cases := []struct{ name, body, wantSub string }{
		{"sem conta", `{"accountId":"","description":"x","direction":"outflow","amountCents":100,"occurredOn":"2026-06-05"}`, "accountId vazio"},
		{"descrição vazia", `{"accountId":"a1","description":"  ","direction":"outflow","amountCents":100,"occurredOn":"2026-06-05"}`, "description vazio"},
		{"direção inválida", `{"accountId":"a1","description":"x","direction":"banana","amountCents":100,"occurredOn":"2026-06-05"}`, "direction inválido"},
		{"valor zero", `{"accountId":"a1","description":"x","direction":"outflow","amountCents":0,"occurredOn":"2026-06-05"}`, "amountCents inválido"},
		{"data inválida", `{"accountId":"a1","description":"x","direction":"outflow","amountCents":100,"occurredOn":"05/06/2026"}`, "occurredOn inválido"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rec := doJSON(t, transacoes.CreateHandler(transacoes.NewService(&fakeStore{})), http.MethodPost, "/transactions", tc.body, "")
			if rec.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, quero 400", rec.Code)
			}
			if !strings.Contains(rec.Body.String(), tc.wantSub) {
				t.Errorf("body = %q, quero conter %q", rec.Body.String(), tc.wantSub)
			}
		})
	}
}

func TestCreateHandlerContaInvalida400(t *testing.T) {
	fake := &fakeStore{createErr: store.ErrTransactionNotFound}
	rec := doJSON(t, transacoes.CreateHandler(transacoes.NewService(fake)), http.MethodPost, "/transactions", validCreateBody, "")
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, quero 400 (conta de outro usuário)", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "conta ou categoria inválida") {
		t.Errorf("body = %q", rec.Body.String())
	}
}

func TestCreateHandlerCorpoInvalido400(t *testing.T) {
	rec := doJSON(t, transacoes.CreateHandler(transacoes.NewService(&fakeStore{})), http.MethodPost, "/transactions", `{nope`, "")
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, quero 400", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "corpo inválido") {
		t.Errorf("body = %q", rec.Body.String())
	}
}

func TestCreateHandlerSemUsuario401(t *testing.T) {
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/transactions", strings.NewReader(validCreateBody)) // sem userID
	transacoes.CreateHandler(transacoes.NewService(&fakeStore{})).ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, quero 401", rec.Code)
	}
}

func TestGetTransactionHandler200E404(t *testing.T) {
	ok := doJSON(t, transacoes.GetTransactionHandler(transacoes.NewService(&fakeStore{detail: detailRow()})), http.MethodGet, "/transactions/t1", "", "t1")
	if ok.Code != http.StatusOK {
		t.Fatalf("status = %d, quero 200", ok.Code)
	}
	missing := doJSON(t, transacoes.GetTransactionHandler(transacoes.NewService(&fakeStore{getErr: store.ErrTransactionNotFound})), http.MethodGet, "/transactions/x", "", "x")
	if missing.Code != http.StatusNotFound {
		t.Fatalf("status = %d, quero 404", missing.Code)
	}
}

func TestUpdateHandler200E404(t *testing.T) {
	const body = `{"categoryId":"c1","description":"Mercado","direction":"outflow","amountCents":62000,"occurredOn":"2026-06-05"}`
	ok := doJSON(t, transacoes.UpdateHandler(transacoes.NewService(&fakeStore{detail: detailRow()})), http.MethodPatch, "/transactions/t1", body, "t1")
	if ok.Code != http.StatusOK {
		t.Fatalf("status = %d, quero 200", ok.Code)
	}
	missing := doJSON(t, transacoes.UpdateHandler(transacoes.NewService(&fakeStore{updateErr: store.ErrTransactionNotFound})), http.MethodPatch, "/transactions/x", body, "x")
	if missing.Code != http.StatusNotFound {
		t.Fatalf("status = %d, quero 404", missing.Code)
	}
}

func TestDeleteHandler204E404(t *testing.T) {
	ok := doJSON(t, transacoes.DeleteHandler(transacoes.NewService(&fakeStore{})), http.MethodDelete, "/transactions/t1", "", "t1")
	if ok.Code != http.StatusNoContent {
		t.Fatalf("status = %d, quero 204", ok.Code)
	}
	missing := doJSON(t, transacoes.DeleteHandler(transacoes.NewService(&fakeStore{deleteErr: store.ErrTransactionNotFound})), http.MethodDelete, "/transactions/x", "", "x")
	if missing.Code != http.StatusNotFound {
		t.Fatalf("status = %d, quero 404", missing.Code)
	}
}
