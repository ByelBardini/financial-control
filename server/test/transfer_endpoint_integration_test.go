//go:build integration

package test

import (
	"context"
	"net/http"
	"os"
	"testing"

	"financial-control/server/internal/dashboard"
	"financial-control/server/internal/store"
	"financial-control/server/internal/transfers"
)

// TestTransferEndpointE2E exercita POST /transfers ponta a ponta (router→handler→service→store):
// o caminho feliz move os saldos e devolve o group id; o resumo do mês ignora as pernas; e as
// rejeições (origem==destino, conta alheia, isolamento A×B) vêm como 400 sem vazar.
func TestTransferEndpointE2E(t *testing.T) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		t.Skip("DATABASE_URL não definido; pulando integração (precisa do Postgres)")
	}
	ctx := context.Background()
	applySeed(t, ctx, dsn)
	seedUserB(t, ctx, dsn)

	st, err := store.Open(ctx, dsn)
	if err != nil {
		t.Fatalf("store.Open: %v", err)
	}
	defer st.Close()

	srv := newServer(t, st)
	tokenA := login(t, srv.URL, "teste@teste.com", "12345")
	tokenB := login(t, srv.URL, "userb@teste.com", "12345")

	origemAntes := accountBalanceByName(t, srv.URL, tokenA, "Nubank")
	destinoAntes := accountBalanceByName(t, srv.URL, tokenA, "Carteira")

	t.Run("transferência 201 move saldos e devolve grupo", func(t *testing.T) {
		body := `{"originAccountId":"` + userANubankAcc + `","destinationAccountId":"` + userACarteiraAcc + `","amountCents":10000,"occurredOn":"2026-06-15"}`
		var res transfers.TransferResult
		if code := sendJSON(t, http.MethodPost, srv.URL+"/transfers", tokenA, body, &res); code != http.StatusCreated {
			t.Fatalf("POST /transfers = %d, quero 201", code)
		}
		if res.GroupID == "" || res.AmountCents != 10000 {
			t.Fatalf("resultado = %+v, quero groupId não-vazio e amountCents 10000", res)
		}
		if got := accountBalanceByName(t, srv.URL, tokenA, "Nubank"); got != origemAntes-10000 {
			t.Errorf("saldo Nubank = %d, quero %d", got, origemAntes-10000)
		}
		if got := accountBalanceByName(t, srv.URL, tokenA, "Carteira"); got != destinoAntes+10000 {
			t.Errorf("saldo Carteira = %d, quero %d", got, destinoAntes+10000)
		}
	})

	t.Run("resumo do mês ignora a transferência", func(t *testing.T) {
		var bal dashboard.MonthBalance
		getJSON(t, srv.URL+"/dashboard/summary", tokenA, &bal)
		if bal.ReceitasCents != 320000 || bal.GastosCents != 111550 {
			t.Errorf("receitas/gastos = %d/%d, quero 320000/111550 (transferência fora do resumo)", bal.ReceitasCents, bal.GastosCents)
		}
	})

	t.Run("origem == destino → 400", func(t *testing.T) {
		body := `{"originAccountId":"` + userANubankAcc + `","destinationAccountId":"` + userANubankAcc + `","amountCents":5000,"occurredOn":"2026-06-15"}`
		if code := sendJSON(t, http.MethodPost, srv.URL+"/transfers", tokenA, body, nil); code != http.StatusBadRequest {
			t.Errorf("origem==destino = %d, quero 400", code)
		}
	})

	t.Run("A×B: B não transfere da conta de A → 400, sem mover o saldo de A", func(t *testing.T) {
		base := accountBalanceByName(t, srv.URL, tokenA, "Nubank")
		body := `{"originAccountId":"` + userANubankAcc + `","destinationAccountId":"` + userACarteiraAcc + `","amountCents":5000,"occurredOn":"2026-06-15"}`
		if code := sendJSON(t, http.MethodPost, srv.URL+"/transfers", tokenB, body, nil); code != http.StatusBadRequest {
			t.Errorf("B transferindo da conta de A = %d, quero 400", code)
		}
		if got := accountBalanceByName(t, srv.URL, tokenA, "Nubank"); got != base {
			t.Errorf("saldo de A mudou após a tentativa de B (%d) — VAZAMENTO", got)
		}
	})
}
