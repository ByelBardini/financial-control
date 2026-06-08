package account_test

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"financial-control/server/internal/account"
	"financial-control/server/internal/auth"
	"financial-control/server/internal/store"
)

// authedBody monta uma requisição com corpo já autenticada (userID no contexto).
func authedBody(method, target, userID, body string) *http.Request {
	req := httptest.NewRequest(method, target, strings.NewReader(body))
	return req.WithContext(auth.WithUserID(req.Context(), userID))
}

const cartaoBody = `{"name":"Cartão Nubank","accountType":"credit_card","openingBalanceCents":0,"icon":"credit_card","tone":"primary","dotColor":"#8a05be","subtitle":"Final 4022","creditLimitCents":500000}`

var cartaoDetail = store.AccountDetail{
	ID: "a9", Name: "Cartão Nubank", AccountType: "credit_card", Subtitle: "Final 4022",
	BalanceCents: 0, Icon: "credit_card", Tone: "primary", DotColor: "#8a05be", CreditLimitCents: 500000,
}

const cartaoDetailJSON = `{"id":"a9","name":"Cartão Nubank","accountType":"credit_card","subtitle":"Final 4022","balanceCents":0,"icon":"credit_card","tone":"primary","dotColor":"#8a05be","creditLimitCents":500000}` + "\n"

func TestCreateHandlerCria201EMapeiaOpcionais(t *testing.T) {
	fake := &fakeAccountStore{newID: "a9", detail: cartaoDetail}
	rec := httptest.NewRecorder()
	account.CreateHandler(account.NewService(fake)).ServeHTTP(rec, authedBody(http.MethodPost, "/accounts", "u-7", cartaoBody))

	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, quero 201", rec.Code)
	}
	if got := rec.Body.String(); got != cartaoDetailJSON {
		t.Fatalf("body = %q, quero %q", got, cartaoDetailJSON)
	}
	if fake.gotUserID != "u-7" {
		t.Errorf("store recebeu userID %q, quero u-7 (escopo)", fake.gotUserID)
	}
	if fake.gotInput.CreditLimitCents == nil || *fake.gotInput.CreditLimitCents != 500000 {
		t.Errorf("creditLimitCents mapeado = %v, quero 500000", fake.gotInput.CreditLimitCents)
	}
	if fake.gotInput.Subtitle == nil || *fake.gotInput.Subtitle != "Final 4022" {
		t.Errorf("subtitle mapeado = %v, quero Final 4022", fake.gotInput.Subtitle)
	}
}

func TestCreateHandlerValidacao400ComValorOfensivo(t *testing.T) {
	body := `{"name":"X","accountType":"checking","openingBalanceCents":0,"icon":"home","tone":"primary","dotColor":"blue"}`
	rec := httptest.NewRecorder()
	account.CreateHandler(account.NewService(&fakeAccountStore{})).ServeHTTP(rec, authedBody(http.MethodPost, "/accounts", "u-1", body))

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, quero 400", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "blue") {
		t.Errorf("erro = %q, deveria citar o valor ofensivo (blue)", rec.Body.String())
	}
}

func TestCreateHandlerCartaoComSaldo400(t *testing.T) {
	cases := []struct {
		name    string
		opening int64
	}{
		{"saldo positivo", 50000},
		{"saldo negativo (dívida inicial não rola)", -50000},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			body := fmt.Sprintf(`{"name":"Cartão","accountType":"credit_card","openingBalanceCents":%d,"icon":"credit_card","tone":"primary","dotColor":"#8a05be","creditLimitCents":500000}`, tc.opening)
			rec := httptest.NewRecorder()
			account.CreateHandler(account.NewService(&fakeAccountStore{})).ServeHTTP(rec, authedBody(http.MethodPost, "/accounts", "u-1", body))

			if rec.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, quero 400 (cartão não tem saldo inicial)", rec.Code)
			}
			if !strings.Contains(rec.Body.String(), "saldo inicial") {
				t.Errorf("erro = %q, deveria explicar que cartão não tem saldo inicial", rec.Body.String())
			}
		})
	}
}

func TestCreateHandlerCreditLimitForaDeCartao400(t *testing.T) {
	body := `{"name":"Conta","accountType":"checking","openingBalanceCents":0,"icon":"home","tone":"primary","dotColor":"#d0bcff","creditLimitCents":1000}`
	rec := httptest.NewRecorder()
	account.CreateHandler(account.NewService(&fakeAccountStore{})).ServeHTTP(rec, authedBody(http.MethodPost, "/accounts", "u-1", body))

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, quero 400", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "credit_card") {
		t.Errorf("erro = %q, deveria explicar que creditLimitCents é só p/ credit_card", rec.Body.String())
	}
}

func TestCreateHandlerCorpoMalformado400(t *testing.T) {
	rec := httptest.NewRecorder()
	account.CreateHandler(account.NewService(&fakeAccountStore{})).ServeHTTP(rec, authedBody(http.MethodPost, "/accounts", "u-1", "{"))
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, quero 400 (JSON malformado)", rec.Code)
	}
}

func TestCreateHandlerSemUsuario401(t *testing.T) {
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/accounts", strings.NewReader(cartaoBody)) // sem userID
	account.CreateHandler(account.NewService(&fakeAccountStore{})).ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, quero 401", rec.Code)
	}
}

func TestUpdateHandlerEdita200(t *testing.T) {
	fake := &fakeAccountStore{detail: cartaoDetail}
	req := authedBody(http.MethodPatch, "/accounts/a9", "u-7", cartaoBody)
	req.SetPathValue("id", "a9")
	rec := httptest.NewRecorder()
	account.UpdateHandler(account.NewService(fake)).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, quero 200", rec.Code)
	}
	if got := rec.Body.String(); got != cartaoDetailJSON {
		t.Fatalf("body = %q, quero %q", got, cartaoDetailJSON)
	}
	if fake.gotID != "a9" || fake.gotUserID != "u-7" {
		t.Errorf("escopo = id %q user %q, quero a9/u-7", fake.gotID, fake.gotUserID)
	}
}

func TestUpdateHandlerConverterEmCartaoRejeitado400(t *testing.T) {
	// Converter uma conta existente (com saldo) em credit_card pela edição é proibido:
	// cartão não tem saldo inicial (invariante que o POST já garante). Sem essa trava o
	// opening_balance vira fatura fantasma no /contas/cards e no Raio-X.
	fake := &fakeAccountStore{detail: store.AccountDetail{
		ID: "a1", Name: "Conta Corrente", AccountType: "checking", BalanceCents: 100000,
		Icon: "account_balance", Tone: "primary", DotColor: "#d0bcff",
	}}
	req := authedBody(http.MethodPatch, "/accounts/a1", "u-7", cartaoBody) // cartaoBody = credit_card
	req.SetPathValue("id", "a1")
	rec := httptest.NewRecorder()
	account.UpdateHandler(account.NewService(fake)).ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, quero 400 (não dá pra converter conta em cartão)", rec.Code)
	}
	if body := rec.Body.String(); !strings.Contains(body, "checking") {
		t.Errorf("erro = %q, deveria citar o tipo atual ofensivo (checking)", body)
	}
	if fake.gotInput.Name != "" {
		t.Errorf("UpdateAccount não devia ser chamado numa conversão rejeitada (gotInput = %+v)", fake.gotInput)
	}
}

func TestUpdateHandlerNaoEncontrada404(t *testing.T) {
	fake := &fakeAccountStore{getErr: store.ErrAccountNotFound}
	req := authedBody(http.MethodPatch, "/accounts/zzz", "u-1", cartaoBody)
	req.SetPathValue("id", "zzz")
	rec := httptest.NewRecorder()
	account.UpdateHandler(account.NewService(fake)).ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, quero 404", rec.Code)
	}
}

func TestArchiveHandlerArquiva204(t *testing.T) {
	fake := &fakeAccountStore{}
	req := authedBody(http.MethodDelete, "/accounts/a9", "u-7", "")
	req.SetPathValue("id", "a9")
	rec := httptest.NewRecorder()
	account.ArchiveHandler(account.NewService(fake)).ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d, quero 204", rec.Code)
	}
	if rec.Body.Len() != 0 {
		t.Errorf("204 não pode ter corpo, veio %q", rec.Body.String())
	}
	if fake.gotID != "a9" || fake.gotUserID != "u-7" {
		t.Errorf("escopo = id %q user %q, quero a9/u-7", fake.gotID, fake.gotUserID)
	}
}

func TestArchiveHandlerNaoEncontrada404(t *testing.T) {
	fake := &fakeAccountStore{archiveErr: store.ErrAccountNotFound}
	req := authedBody(http.MethodDelete, "/accounts/zzz", "u-1", "")
	req.SetPathValue("id", "zzz")
	rec := httptest.NewRecorder()
	account.ArchiveHandler(account.NewService(fake)).ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, quero 404", rec.Code)
	}
}

func TestGetHandlerDevolveContaCompleta200(t *testing.T) {
	fake := &fakeAccountStore{detail: cartaoDetail}
	req := authedBody(http.MethodGet, "/accounts/a9", "u-7", "")
	req.SetPathValue("id", "a9")
	rec := httptest.NewRecorder()
	account.GetHandler(account.NewService(fake)).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, quero 200", rec.Code)
	}
	if got := rec.Body.String(); got != cartaoDetailJSON {
		t.Fatalf("body = %q, quero %q", got, cartaoDetailJSON)
	}
	if fake.gotID != "a9" || fake.gotUserID != "u-7" {
		t.Errorf("escopo = id %q user %q, quero a9/u-7", fake.gotID, fake.gotUserID)
	}
}

func TestGetHandlerNaoEncontrada404(t *testing.T) {
	fake := &fakeAccountStore{getErr: store.ErrAccountNotFound}
	req := authedBody(http.MethodGet, "/accounts/zzz", "u-1", "")
	req.SetPathValue("id", "zzz")
	rec := httptest.NewRecorder()
	account.GetHandler(account.NewService(fake)).ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, quero 404", rec.Code)
	}
}

func TestGetHandlerSemUsuario401(t *testing.T) {
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/accounts/a9", nil) // sem userID
	req.SetPathValue("id", "a9")
	account.GetHandler(account.NewService(&fakeAccountStore{})).ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, quero 401", rec.Code)
	}
}
