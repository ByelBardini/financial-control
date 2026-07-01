package transfers_test

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"financial-control/server/internal/auth"
	"financial-control/server/internal/store"
	"financial-control/server/internal/transfers"
)

// fakeTransferStore é o fake nomeado do store: guarda o que recebeu (pra provar o escopo por
// usuário) e devolve o group id / erro configurados.
type fakeTransferStore struct {
	gotUserID string
	gotInput  store.TransferInput
	groupID   string
	err       error
}

func (f *fakeTransferStore) CreateTransfer(ctx context.Context, userID string, in store.TransferInput) (string, error) {
	f.gotUserID = userID
	f.gotInput = in
	return f.groupID, f.err
}

// doJSON dispara uma requisição autenticada (userID "u-1") com corpo.
func doJSON(t *testing.T, h http.Handler, body string) *httptest.ResponseRecorder {
	t.Helper()
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/transfers", strings.NewReader(body))
	req = req.WithContext(auth.WithUserID(req.Context(), "u-1"))
	h.ServeHTTP(rec, req)
	return rec
}

const validBody = `{"originAccountId":"a1","destinationAccountId":"a2","amountCents":10000,"occurredOn":"2026-06-05"}`

func TestCreateHandler201EEco(t *testing.T) {
	fake := &fakeTransferStore{groupID: "g1"}
	rec := doJSON(t, transfers.CreateHandler(transfers.NewService(fake)), validBody)
	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, quero 201", rec.Code)
	}
	const want = `{"groupId":"g1","originAccountId":"a1","destinationAccountId":"a2","amountCents":10000,"occurredOn":"2026-06-05"}` + "\n"
	if got := rec.Body.String(); got != want {
		t.Fatalf("body =\n%q\nquero\n%q", got, want)
	}
	if fake.gotUserID != "u-1" {
		t.Errorf("store recebeu userID %q, quero u-1 (escopo do token)", fake.gotUserID)
	}
	// Sem descrição no corpo → fallback "Transferência" antes de gravar.
	if fake.gotInput.Description != "Transferência" || fake.gotInput.AmountCents != 10000 {
		t.Errorf("store recebeu {desc %q, cents %d}, quero {Transferência, 10000}", fake.gotInput.Description, fake.gotInput.AmountCents)
	}
}

func TestCreateHandlerValidacao400(t *testing.T) {
	cases := []struct{ name, body, wantSub string }{
		{"sem origem", `{"originAccountId":"","destinationAccountId":"a2","amountCents":100,"occurredOn":"2026-06-05"}`, "originAccountId vazio"},
		{"sem destino", `{"originAccountId":"a1","destinationAccountId":"","amountCents":100,"occurredOn":"2026-06-05"}`, "destinationAccountId vazio"},
		{"origem == destino", `{"originAccountId":"a1","destinationAccountId":"a1","amountCents":100,"occurredOn":"2026-06-05"}`, "origem e destino iguais"},
		{"valor zero", `{"originAccountId":"a1","destinationAccountId":"a2","amountCents":0,"occurredOn":"2026-06-05"}`, "amountCents inválido"},
		{"data inválida", `{"originAccountId":"a1","destinationAccountId":"a2","amountCents":100,"occurredOn":"05/06/2026"}`, "occurredOn inválido"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rec := doJSON(t, transfers.CreateHandler(transfers.NewService(&fakeTransferStore{})), tc.body)
			if rec.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, quero 400", rec.Code)
			}
			if !strings.Contains(rec.Body.String(), tc.wantSub) {
				t.Errorf("body = %q, quero conter %q", rec.Body.String(), tc.wantSub)
			}
		})
	}
}

func TestCreateHandlerCorpoInvalido400(t *testing.T) {
	rec := doJSON(t, transfers.CreateHandler(transfers.NewService(&fakeTransferStore{})), `{nope`)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, quero 400", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "corpo inválido") {
		t.Errorf("body = %q", rec.Body.String())
	}
}

func TestCreateHandlerContaInvalida400(t *testing.T) {
	fake := &fakeTransferStore{err: store.ErrTransferInvalid}
	rec := doJSON(t, transfers.CreateHandler(transfers.NewService(fake)), validBody)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, quero 400 (conta não é do usuário)", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "transferência inválida") {
		t.Errorf("body = %q", rec.Body.String())
	}
}

func TestCreateHandlerErroGenerico500(t *testing.T) {
	fake := &fakeTransferStore{err: errors.New("pool caiu")}
	rec := doJSON(t, transfers.CreateHandler(transfers.NewService(fake)), validBody)
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, quero 500", rec.Code)
	}
}

func TestCreateHandlerSemUsuario401(t *testing.T) {
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/transfers", strings.NewReader(validBody)) // sem userID
	transfers.CreateHandler(transfers.NewService(&fakeTransferStore{})).ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, quero 401", rec.Code)
	}
}
