//go:build integration

package test

import (
	"context"
	"os"
	"testing"

	"github.com/jackc/pgx/v5"

	"financial-control/server/internal/account"
	"financial-control/server/internal/dashboard"
	"financial-control/server/internal/store"
)

// userACarteiraAcc é a carteira de dinheiro do usuário A no seed (destino da transferência).
const userACarteiraAcc = "a0000000-0000-0000-0000-000000000002"

// TestTransferReportExclusion prova as duas garantias da Fase 1 da transferência:
//   - uma dupla-entrada (kind='transfer') MOVE os saldos das duas contas, mas NÃO conta
//     como receita/gasto do mês (resumo e categorias a ignoram, como já fazem com investment);
//   - o CHECK tx_transfer_coherent casa transfer_group_id com kind='transfer' (tudo-ou-nada).
func TestTransferReportExclusion(t *testing.T) {
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

	origemAntes := accountBalanceByName(t, srv.URL, token, "Nubank")
	destinoAntes := accountBalanceByName(t, srv.URL, token, "Carteira")

	// Transfere R$ 100,00 do Nubank para a Carteira (dupla entrada, mesmo grupo).
	insertTransferPair(t, ctx, dsn, userANubankAcc, userACarteiraAcc, "100.00")

	t.Run("resumo do mês ignora as duas pernas", func(t *testing.T) {
		var bal dashboard.MonthBalance
		getJSON(t, srv.URL+"/dashboard/summary", token, &bal)
		if bal.ReceitasCents != 320000 || bal.GastosCents != 111550 {
			t.Fatalf("receitas/gastos = %d/%d, quero 320000/111550 (transferência não é receita nem gasto)", bal.ReceitasCents, bal.GastosCents)
		}
	})

	t.Run("gasto por categoria ignora a perna de saída", func(t *testing.T) {
		var cats []dashboard.CategorySpend
		getJSON(t, srv.URL+"/dashboard/categories", token, &cats)
		if len(cats) != 3 {
			t.Fatalf("len categorias = %d, quero 3 (a transferência não cria categoria de gasto)", len(cats))
		}
	})

	t.Run("mas os saldos das duas contas se movem", func(t *testing.T) {
		origemDepois := accountBalanceByName(t, srv.URL, token, "Nubank")
		destinoDepois := accountBalanceByName(t, srv.URL, token, "Carteira")
		if origemDepois != origemAntes-10000 {
			t.Errorf("saldo Nubank = %d, quero %d (caiu 100,00)", origemDepois, origemAntes-10000)
		}
		if destinoDepois != destinoAntes+10000 {
			t.Errorf("saldo Carteira = %d, quero %d (subiu 100,00)", destinoDepois, destinoAntes+10000)
		}
	})

	t.Run("CHECK rejeita transfer sem grupo e standard com grupo", func(t *testing.T) {
		conn, err := pgx.Connect(ctx, dsn)
		if err != nil {
			t.Fatalf("pgx.Connect: %v", err)
		}
		defer conn.Close(ctx)

		_, err = conn.Exec(ctx, `INSERT INTO transactions
			(account_id, user_id, description, kind, direction, amount, occurred_on)
			VALUES ($1, $2, 'sem grupo', 'transfer', 'expense', 10.00, now()::date)`,
			userANubankAcc, userAID)
		if err == nil {
			t.Error("transfer sem transfer_group_id foi aceita; quero rejeição do tx_transfer_coherent")
		}

		_, err = conn.Exec(ctx, `INSERT INTO transactions
			(account_id, user_id, description, kind, direction, amount, occurred_on, transfer_group_id)
			VALUES ($1, $2, 'standard com grupo', 'standard', 'expense', 10.00, now()::date, gen_random_uuid())`,
			userANubankAcc, userAID)
		if err == nil {
			t.Error("standard com transfer_group_id foi aceita; quero rejeição do tx_transfer_coherent")
		}
	})
}

// userAID é o id do usuário padrão do seed (dono das contas/transações).
const userAID = "00000000-0000-0000-0000-000000000001"

// insertTransferPair grava uma transferência como dupla entrada num único statement: a perna de
// saída (expense) na origem e a de entrada (income) no destino, ambas kind='transfer' e dividindo
// um transfer_group_id recém-gerado. Espelha a query CreateTransfer (Fase 2) em SQL cru.
func insertTransferPair(t *testing.T, ctx context.Context, dsn, origin, destination, amount string) {
	t.Helper()
	conn, err := pgx.Connect(ctx, dsn)
	if err != nil {
		t.Fatalf("pgx.Connect: %v", err)
	}
	defer conn.Close(ctx)
	_, err = conn.Exec(ctx, `
		WITH grp AS (SELECT gen_random_uuid() AS gid)
		INSERT INTO transactions
			(account_id, user_id, description, kind, direction, amount, occurred_on, transfer_group_id)
		SELECT leg.account_id, $3, 'Transferência teste', 'transfer', leg.direction,
		       $4::numeric, date_trunc('month', now())::date + 10, grp.gid
		FROM (VALUES ($1::uuid, 'expense'), ($2::uuid, 'income')) AS leg(account_id, direction)
		CROSS JOIN grp`,
		origin, destination, userAID, amount)
	if err != nil {
		t.Fatalf("inserir par de transferência: %v", err)
	}
}

// accountBalanceByName lê o saldo (centavos) de uma conta pelo nome via GET /accounts.
func accountBalanceByName(t *testing.T, baseURL, token, name string) int64 {
	t.Helper()
	var accs []account.Account
	getJSON(t, baseURL+"/accounts", token, &accs)
	for _, a := range accs {
		if a.Name == name {
			return a.BalanceCents
		}
	}
	t.Fatalf("conta %q não encontrada em /accounts", name)
	return 0
}
