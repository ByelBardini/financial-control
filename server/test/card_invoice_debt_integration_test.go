//go:build integration

package test

import (
	"context"
	"net/http"
	"os"
	"strconv"
	"strings"
	"testing"
	"time"

	"financial-control/server/internal/store"
	"financial-control/server/internal/transacoes"
)

// TestCardInvoiceDebtE2E cria um cartão, lança gastos em dois meses + paga parte de um, e confere
// que GET /transacoes/debts traz as faturas mensais abertas ("Fatura {mês} - {cartão}") com o
// devido (gastos − pagamentos), e que pagar reduz o valor.
func TestCardInvoiceDebtE2E(t *testing.T) {
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

	cardBody := `{"name":"Cartão Teste","accountType":"credit_card","openingBalanceCents":0,"icon":"credit_card","tone":"primary","dotColor":"#8a05be","creditLimitCents":300000,"paymentAccountId":"` + userANubankAcc + `"}`
	var card struct {
		ID string `json:"id"`
	}
	if code := sendJSON(t, http.MethodPost, srv.URL+"/accounts", token, cardBody, &card); code != http.StatusCreated {
		t.Fatalf("POST /accounts (cartão) = %d, quero 201", code)
	}

	thisMonth := time.Now().Format("2006-01-02")
	oldMonth := time.Now().AddDate(0, -3, 0).Format("2006-01-02")
	charge := func(amount int64, on string) {
		body := `{"accountId":"` + card.ID + `","description":"Compra","direction":"outflow","amountCents":` + strconv.FormatInt(amount, 10) + `,"occurredOn":"` + on + `"}`
		if code := sendJSON(t, http.MethodPost, srv.URL+"/transactions", token, body, nil); code != http.StatusCreated {
			t.Fatalf("POST /transactions = %d, quero 201", code)
		}
	}
	charge(30000, thisMonth) // fatura do mês corrente: 300,00
	charge(25000, oldMonth)  // fatura de 3 meses atrás: 250,00

	// Paga 100,00 da fatura do mês corrente (transferência Carteira → cartão).
	payBody := `{"originAccountId":"` + userACarteiraAcc + `","destinationAccountId":"` + card.ID + `","amountCents":10000,"occurredOn":"` + thisMonth + `"}`
	if code := sendJSON(t, http.MethodPost, srv.URL+"/transfers", token, payBody, nil); code != http.StatusCreated {
		t.Fatalf("POST /transfers = %d, quero 201", code)
	}

	var debts []transacoes.FutureDebt
	getJSON(t, srv.URL+"/transacoes/debts", token, &debts)

	var faturas []transacoes.FutureDebt
	for _, d := range debts {
		if d.InstallmentLabel == "Fatura do cartão" {
			faturas = append(faturas, d)
		}
	}
	if len(faturas) != 2 {
		t.Fatalf("len faturas = %d, quero 2 (mês corrente + 3 meses atrás); debts=%+v", len(faturas), debts)
	}
	for _, f := range faturas {
		if !strings.Contains(f.Label, "Cartão Teste") || !strings.HasPrefix(f.Label, "Fatura ") {
			t.Errorf("label da fatura = %q, quero 'Fatura {mês}/{ano} - Cartão Teste'", f.Label)
		}
		if f.Icon != "credit_card" {
			t.Errorf("ícone da fatura = %q, quero credit_card", f.Icon)
		}
	}

	// Mês corrente: 300 − 100 pago = 200,00 devido. Mês antigo: 250,00 devido.
	amounts := map[int64]bool{}
	for _, f := range faturas {
		amounts[f.AmountCents] = true
	}
	if !amounts[20000] || !amounts[25000] {
		t.Errorf("valores das faturas = %v, quero conter 20000 (mês pago) e 25000 (antigo)", amounts)
	}
}
