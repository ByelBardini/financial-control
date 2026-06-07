//go:build integration

package test

import (
	"context"
	"net/http"
	"os"
	"testing"

	"github.com/jackc/pgx/v5"

	"financial-control/server/internal/account"
	"financial-control/server/internal/auth"
	"financial-control/server/internal/dashboard"
	"financial-control/server/internal/store"
)

const (
	userBID    = "00000000-0000-0000-0000-0000000000b0"
	userBAccID = "b0000000-0000-0000-0000-0000000000a1"
	userBCatID = "b0000000-0000-0000-0000-0000000000c1"
)

// TestIsolamentoEntreUsuarios é a prova de fogo do isolamento: o userID vem SÓ do
// token (nunca de input), então não há como um usuário pedir os dados de outro.
// Usuário A = padrão (dados demo do seed); usuário B = 1 conta + 1 gasto distinto.
func TestIsolamentoEntreUsuarios(t *testing.T) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		t.Skip("DATABASE_URL não definido; pulando integração")
	}
	ctx := context.Background()
	applySeed(t, ctx, dsn) // usuário A com os dados demo
	seedUserB(t, ctx, dsn) // usuário B com "B-Wallet" + 1 gasto de 99999c

	st, err := store.Open(ctx, dsn)
	if err != nil {
		t.Fatalf("store.Open: %v", err)
	}
	defer st.Close()

	srv := newServer(t, st)
	tokenA := login(t, srv.URL, "teste@teste.com", "12345")
	tokenB := login(t, srv.URL, "userb@teste.com", "12345")

	// Contas: A não enxerga "B-Wallet"; B só enxerga "B-Wallet".
	var accsA []account.Account
	getJSON(t, srv.URL+"/accounts", tokenA, &accsA)
	if len(accsA) != 3 || hasAccount(accsA, "B-Wallet") {
		t.Fatalf("A viu %d contas (B-Wallet presente=%v) — VAZAMENTO", len(accsA), hasAccount(accsA, "B-Wallet"))
	}
	var accsB []account.Account
	getJSON(t, srv.URL+"/accounts", tokenB, &accsB)
	if len(accsB) != 1 || accsB[0].Name != "B-Wallet" {
		t.Fatalf("B deveria ver só B-Wallet, viu %+v", accsB)
	}

	// Summary: A = totais demo (B não vaza); B = só os dados de B.
	var balA dashboard.MonthBalance
	getJSON(t, srv.URL+"/dashboard/summary", tokenA, &balA)
	if balA.ReceitasCents != 320000 || balA.GastosCents != 111550 {
		t.Fatalf("A summary = %d/%d — B vazou?", balA.ReceitasCents, balA.GastosCents)
	}
	var balB dashboard.MonthBalance
	getJSON(t, srv.URL+"/dashboard/summary", tokenB, &balB)
	if balB.GastosCents != 99999 || balB.ReceitasCents != 0 {
		t.Fatalf("B summary = %d/%d, quero gastos 99999 / receitas 0", balB.GastosCents, balB.ReceitasCents)
	}

	// Sem token → 401 (não dá pra ler nada sem logar).
	res, err := http.Get(srv.URL + "/accounts")
	if err != nil {
		t.Fatalf("GET sem token: %v", err)
	}
	res.Body.Close()
	if res.StatusCode != http.StatusUnauthorized {
		t.Fatalf("GET /accounts sem token = %d, quero 401", res.StatusCode)
	}
}

// seedUserB cria um segundo usuário com dados próprios e distintos (idempotente).
// Roda DEPOIS do applySeed (que truncou as tabelas de dados), então B fica com
// exatamente 1 conta e 1 transação.
func seedUserB(t *testing.T, ctx context.Context, dsn string) {
	t.Helper()
	hash, err := auth.HashPassword("12345")
	if err != nil {
		t.Fatalf("hash: %v", err)
	}
	conn, err := pgx.Connect(ctx, dsn)
	if err != nil {
		t.Fatalf("pgx.Connect: %v", err)
	}
	defer conn.Close(ctx)

	// Um Exec por statement: o protocolo estendido do pgx (com args) só aceita um
	// comando por chamada.
	exec := func(sql string, args ...any) {
		if _, err := conn.Exec(ctx, sql, args...); err != nil {
			t.Fatalf("seed user B: %v", err)
		}
	}
	exec(`INSERT INTO users (id, email, password_hash) VALUES ($1, 'userb@teste.com', $2)
	      ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash, is_active = true`,
		userBID, string(hash))
	exec(`INSERT INTO accounts (id, user_id, name, account_type, opening_balance, icon, tone, dot_color)
	      VALUES ($1, $2, 'B-Wallet', 'cash', 0, 'account_balance_wallet', 'neutral', '#958ea0')
	      ON CONFLICT (id) DO NOTHING`, userBAccID, userBID)
	exec(`INSERT INTO categories (id, user_id, name, kind) VALUES ($1, $2, 'B-Cat', 'expense')
	      ON CONFLICT (id) DO NOTHING`, userBCatID, userBID)
	exec(`INSERT INTO transactions (account_id, user_id, category_id, description, direction, amount, occurred_on)
	      VALUES ($1, $2, $3, 'B-Gasto', 'expense', 999.99, date_trunc('month', now())::date + 1)`,
		userBAccID, userBID, userBCatID)
}

func hasAccount(accs []account.Account, name string) bool {
	for _, a := range accs {
		if a.Name == name {
			return true
		}
	}
	return false
}
