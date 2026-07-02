//go:build integration

package test

import (
	"context"
	"net/http"
	"os"
	"testing"

	"financial-control/server/internal/contas"
	"financial-control/server/internal/store"
)

// TestCardPaymentAccountLinkE2E prova a regra do vínculo obrigatório cartão→conta de banco
// (migration 00009 + validação no pacote account): cartão sem conta de pagamento é 400; com
// uma conta que não é banco (a Carteira em dinheiro) é 400; com a conta de banco (Nubank
// checking) cria e o detalhe do cartão devolve o paymentAccountId pra travar o "Pagar fatura".
func TestCardPaymentAccountLinkE2E(t *testing.T) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		t.Skip("DATABASE_URL não definido; pulando integração (precisa do Postgres)")
	}
	ctx := context.Background()
	applySeed(t, ctx, dsn)

	st, err := store.Open(ctx, dsn)
	if err != nil {
		t.Fatalf("store.Open: %v", err)
	}
	defer st.Close()

	srv := newServer(t, st)
	token := login(t, srv.URL, "teste@teste.com", "12345")

	base := `{"name":"Cartão","accountType":"credit_card","openingBalanceCents":0,"icon":"credit_card","tone":"primary","dotColor":"#8a05be","creditLimitCents":200000`

	t.Run("sem conta de pagamento → 400", func(t *testing.T) {
		if code := sendJSON(t, http.MethodPost, srv.URL+"/accounts", token, base+`}`, nil); code != http.StatusBadRequest {
			t.Fatalf("POST /accounts (cartão sem vínculo) = %d, quero 400", code)
		}
	})

	t.Run("conta de pagamento não-banco (dinheiro) → 400", func(t *testing.T) {
		body := base + `,"paymentAccountId":"` + userACarteiraAcc + `"}`
		if code := sendJSON(t, http.MethodPost, srv.URL+"/accounts", token, body, nil); code != http.StatusBadRequest {
			t.Fatalf("POST /accounts (vínculo em dinheiro) = %d, quero 400", code)
		}
	})

	t.Run("conta de banco válida → 201 e detalhe expõe o vínculo", func(t *testing.T) {
		body := base + `,"paymentAccountId":"` + userANubankAcc + `"}`
		var card struct {
			ID               string `json:"id"`
			PaymentAccountID string `json:"paymentAccountId"`
		}
		if code := sendJSON(t, http.MethodPost, srv.URL+"/accounts", token, body, &card); code != http.StatusCreated {
			t.Fatalf("POST /accounts (vínculo em banco) = %d, quero 201", code)
		}
		if card.PaymentAccountID != userANubankAcc {
			t.Errorf("paymentAccountId da conta criada = %q, quero %q", card.PaymentAccountID, userANubankAcc)
		}
		var detail contas.CardDetail
		getJSON(t, srv.URL+"/contas/cards/"+card.ID, token, &detail)
		if detail.PaymentAccountID != userANubankAcc {
			t.Errorf("CardDetail.paymentAccountId = %q, quero %q (trava o Pagar fatura)", detail.PaymentAccountID, userANubankAcc)
		}
	})
}
