//go:build integration

package test

import (
	"context"
	"net/http"
	"os"
	"strconv"
	"testing"
	"time"

	"financial-control/server/internal/contas"
	"financial-control/server/internal/store"
)

// TestCardDetailEndpointE2E cria um cartão, lança gastos em dois meses + paga parte da fatura
// (transferência), e confere o detalhe agrupado por mês: cabeçalho (fatura/disponível derivados
// do saldo all-time) e as faturas mensais (compras, pagamentos e líquido por competência).
func TestCardDetailEndpointE2E(t *testing.T) {
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

	// Cria o cartão (saldo inicial 0 obrigatório; limite 2000,00).
	cardBody := `{"name":"Cartão Teste","accountType":"credit_card","openingBalanceCents":0,"icon":"credit_card","tone":"primary","dotColor":"#8a05be","creditLimitCents":200000}`
	var card struct {
		ID string `json:"id"`
	}
	if code := sendJSON(t, http.MethodPost, srv.URL+"/accounts", token, cardBody, &card); code != http.StatusCreated {
		t.Fatalf("POST /accounts (cartão) = %d, quero 201", code)
	}

	thisMonth := time.Now().Format("2006-01-02")
	oldMonth := time.Now().AddDate(0, -3, 0).Format("2006-01-02")

	// Lança um gasto neste mês (300,00) e outro 3 meses atrás (200,00) no cartão.
	charge := func(amount int64, on string) {
		body := `{"accountId":"` + card.ID + `","description":"Compra","direction":"outflow","amountCents":` + strconv.FormatInt(amount, 10) + `,"occurredOn":"` + on + `"}`
		if code := sendJSON(t, http.MethodPost, srv.URL+"/transactions", token, body, nil); code != http.StatusCreated {
			t.Fatalf("POST /transactions (gasto cartão) = %d, quero 201", code)
		}
	}
	charge(30000, thisMonth)
	charge(20000, oldMonth)

	// Paga 100,00 da fatura: transferência da Carteira → cartão (perna income no cartão).
	payBody := `{"originAccountId":"` + userACarteiraAcc + `","destinationAccountId":"` + card.ID + `","amountCents":10000,"occurredOn":"` + thisMonth + `"}`
	if code := sendJSON(t, http.MethodPost, srv.URL+"/transfers", token, payBody, nil); code != http.StatusCreated {
		t.Fatalf("POST /transfers (pagar fatura) = %d, quero 201", code)
	}

	var detail contas.CardDetail
	getJSON(t, srv.URL+"/contas/cards/"+card.ID, token, &detail)

	// Cabeçalho: dívida = 300+200−100 = 400,00; disponível = 2000−400 = 1600,00.
	if detail.InvoiceCents != 40000 || detail.AvailableCents != 160000 || detail.LimitCents != 200000 {
		t.Fatalf("cabeçalho = {fatura %d, disp %d, limite %d}, quero {40000, 160000, 200000}", detail.InvoiceCents, detail.AvailableCents, detail.LimitCents)
	}
	if len(detail.Months) != 2 {
		t.Fatalf("len meses = %d, quero 2 (mês corrente + 3 meses atrás)", len(detail.Months))
	}
	// Mês corrente vem primeiro (ordem desc): 300,00 de compra + 100,00 de pagamento → líquido 200,00.
	atual := detail.Months[0]
	if atual.ChargesCents != 30000 || atual.PaymentsCents != 10000 || atual.NetCents != 20000 {
		t.Errorf("fatura do mês = {compras %d, pagtos %d, líquido %d}, quero {30000, 10000, 20000}", atual.ChargesCents, atual.PaymentsCents, atual.NetCents)
	}
	if detail.Months[1].ChargesCents != 20000 {
		t.Errorf("fatura antiga compras = %d, quero 20000", detail.Months[1].ChargesCents)
	}
}
