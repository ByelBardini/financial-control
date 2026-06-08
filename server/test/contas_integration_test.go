//go:build integration

// Integração da tela de Contas: bate no Postgres real (DESTRUTIVO — o seed faz
// TRUNCATE) atrás da tag `integration`, e pula sem DATABASE_URL.
//
//	go test -tags integration ./test/...
package test

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5"

	"financial-control/server/internal/account"
	"financial-control/server/internal/contas"
	"financial-control/server/internal/store"
)

const (
	contasVoucherID = "a0000000-0000-0000-0000-0000000000a1"
	contasCardID    = "a0000000-0000-0000-0000-0000000000c1"
)

func TestContasEndpointsComSeed(t *testing.T) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		t.Skip("DATABASE_URL não definido; pulando integração (precisa do Postgres)")
	}
	ctx := context.Background()
	applySeed(t, ctx, dsn)  // usuário padrão: Nubank (checking), Carteira (cash), Binance (exchange)
	seedContas(t, ctx, dsn) // + Alelo (voucher cheio) + Nubank Cartão (credit_card com dívida)

	st, err := store.Open(ctx, dsn)
	if err != nil {
		t.Fatalf("store.Open: %v", err)
	}
	defer st.Close()

	srv := newServer(t, st)
	token := login(t, srv.URL, "teste@teste.com", "12345")

	t.Run("banks", func(t *testing.T) {
		var banks []contas.BankAccount
		getJSON(t, srv.URL+"/contas/banks", token, &banks)
		if len(banks) != 1 || banks[0].Name != "Nubank" {
			t.Fatalf("banks = %+v, quero só Nubank", banks)
		}
		if banks[0].BalanceCents != 329450 {
			t.Errorf("Nubank balanceCents = %d, quero 329450", banks[0].BalanceCents)
		}
		if banks[0].Subtitle != "Conta Corrente • Final 4022" {
			t.Errorf("subtitle = %q", banks[0].Subtitle)
		}
		if banks[0].BrandColor != "#d0bcff" { // brandColor = dot_color
			t.Errorf("brandColor = %q, quero #d0bcff", banks[0].BrandColor)
		}
		if banks[0].Note == "" || banks[0].NoteTone == "" {
			t.Errorf("note/noteTone derivados vazios: %+v", banks[0])
		}
	})

	t.Run("vouchers", func(t *testing.T) {
		var vs []contas.Voucher
		getJSON(t, srv.URL+"/contas/vouchers", token, &vs)
		if len(vs) != 1 || vs[0].ValueCents != 21500 {
			t.Fatalf("vouchers = %+v, quero Alelo 21500", vs)
		}
		if vs[0].RemainingPercent != 100 || vs[0].Status != "ativo" {
			t.Errorf("vale = {%d,%q}, quero {100,ativo}", vs[0].RemainingPercent, vs[0].Status)
		}
	})

	t.Run("cash", func(t *testing.T) {
		var c contas.CashWallet
		getJSON(t, srv.URL+"/contas/cash", token, &c)
		if c.BalanceCents != 9000 { // Carteira: 300 - 210 (Uber)
			t.Errorf("cash balanceCents = %d, quero 9000", c.BalanceCents)
		}
		if c.ConfidenceLabel != "Confiança Financeira" {
			t.Errorf("confidenceLabel = %q", c.ConfidenceLabel)
		}
	})

	t.Run("xray", func(t *testing.T) {
		var x contas.PovertyXray
		getJSON(t, srv.URL+"/contas/xray", token, &x)
		if x.Rows[0].Cents != 420000 { // dívida = 4200 no cartão
			t.Errorf("dívida = %d, quero 420000", x.Rows[0].Cents)
		}
		if x.Rows[1].Cents != 80000 { // limite 500000 - dívida 420000
			t.Errorf("disponível = %d, quero 80000", x.Rows[1].Cents)
		}
		if x.Panic.Percent != 84 || x.Panic.LevelLabel != "Crítico" {
			t.Errorf("panic = {%d,%q}, quero {84,Crítico}", x.Panic.Percent, x.Panic.LevelLabel)
		}
	})

	t.Run("cards", func(t *testing.T) {
		var cards []contas.CreditCard
		getJSON(t, srv.URL+"/contas/cards", token, &cards)
		if len(cards) != 1 || cards[0].Name != "Nubank Cartão" {
			t.Fatalf("cards = %+v, quero só Nubank Cartão", cards)
		}
		c := cards[0]
		if c.InvoiceCents != 420000 || c.LimitCents != 500000 || c.AvailableCents != 80000 {
			t.Errorf("cartão = {fatura %d, limite %d, disp %d}, quero {420000,500000,80000}", c.InvoiceCents, c.LimitCents, c.AvailableCents)
		}
		if c.UsedPercent != 84 { // 420000/500000
			t.Errorf("usedPercent = %d, quero 84", c.UsedPercent)
		}
		if c.BrandColor != "#8a05be" || c.Icon != "credit_card" {
			t.Errorf("apresentação = {%q,%q}, quero {#8a05be,credit_card}", c.BrandColor, c.Icon)
		}
		if c.Note == "" || c.NoteTone == "" {
			t.Errorf("note/noteTone derivados vazios: %+v", c)
		}
	})

	t.Run("tip", func(t *testing.T) {
		var tip contas.ManagementTip
		getJSON(t, srv.URL+"/contas/tip", token, &tip)
		if tip.Title != "Dica de Gestão" || tip.Body == "" {
			t.Errorf("tip = %+v", tip)
		}
	})

	t.Run("crud-round-trip", func(t *testing.T) {
		// POST cria uma conta de banco nova → entra em /contas/banks.
		body := `{"name":"Conta Teste","accountType":"checking","openingBalanceCents":50000,"icon":"account_balance","tone":"neutral","dotColor":"#958ea0"}`
		var created account.AccountDetail
		if code := sendJSON(t, http.MethodPost, srv.URL+"/accounts", token, body, &created); code != http.StatusCreated {
			t.Fatalf("POST /accounts = %d, quero 201", code)
		}
		if created.ID == "" || created.BalanceCents != 50000 || created.AccountType != "checking" {
			t.Fatalf("conta criada = %+v, quero saldo 50000 / checking", created)
		}

		// GET detalhe traz a conta completa (pra pré-preencher a edição).
		var detail account.AccountDetail
		getJSON(t, srv.URL+"/accounts/"+created.ID, token, &detail)
		if detail.AccountType != "checking" || detail.BalanceCents != 50000 {
			t.Fatalf("GET detail = %+v, quero checking / saldo 50000", detail)
		}

		var banks []contas.BankAccount
		getJSON(t, srv.URL+"/contas/banks", token, &banks)
		if len(banks) != 2 {
			t.Fatalf("após criar, banks = %d, quero 2", len(banks))
		}

		// PATCH renomeia (corpo SEM saldo — saldo não é editável).
		edit := `{"name":"Conta Editada","accountType":"checking","icon":"account_balance","tone":"neutral","dotColor":"#958ea0"}`
		var updated account.AccountDetail
		if code := sendJSON(t, http.MethodPatch, srv.URL+"/accounts/"+created.ID, token, edit, &updated); code != http.StatusOK {
			t.Fatalf("PATCH = %d, quero 200", code)
		}
		if updated.Name != "Conta Editada" {
			t.Errorf("nome após PATCH = %q, quero Conta Editada", updated.Name)
		}
		if updated.BalanceCents != 50000 {
			t.Errorf("saldo após PATCH = %d, quero 50000 (edição não muda saldo)", updated.BalanceCents)
		}

		// DELETE arquiva → some de /contas/banks e o detalhe vira 404.
		if code := sendJSON(t, http.MethodDelete, srv.URL+"/accounts/"+created.ID, token, "", nil); code != http.StatusNoContent {
			t.Fatalf("DELETE = %d, quero 204", code)
		}
		getJSON(t, srv.URL+"/contas/banks", token, &banks)
		if len(banks) != 1 {
			t.Fatalf("após arquivar, banks = %d, quero 1", len(banks))
		}
		if code := sendJSON(t, http.MethodGet, srv.URL+"/accounts/"+created.ID, token, "", nil); code != http.StatusNotFound {
			t.Errorf("GET detail de conta arquivada = %d, quero 404", code)
		}

		// 404 ao arquivar de novo (já arquivada).
		if code := sendJSON(t, http.MethodDelete, srv.URL+"/accounts/"+created.ID, token, "", nil); code != http.StatusNotFound {
			t.Errorf("DELETE de novo = %d, quero 404 (já arquivada)", code)
		}
	})
}

// seedContas adiciona ao usuário padrão (após o applySeed) um vale cheio e um
// cartão de crédito endividado, além do subtítulo na conta de banco existente.
func seedContas(t *testing.T, ctx context.Context, dsn string) {
	t.Helper()
	conn, err := pgx.Connect(ctx, dsn)
	if err != nil {
		t.Fatalf("pgx.Connect: %v", err)
	}
	defer conn.Close(ctx)
	exec := func(sql string, args ...any) {
		if _, err := conn.Exec(ctx, sql, args...); err != nil {
			t.Fatalf("seed contas: %v", err)
		}
	}
	const defaultUser = "00000000-0000-0000-0000-000000000001"

	exec(`UPDATE accounts SET subtitle = 'Conta Corrente • Final 4022'
	      WHERE id = 'a0000000-0000-0000-0000-000000000001'`)

	exec(`INSERT INTO accounts (id, user_id, name, account_type, opening_balance, icon, tone, dot_color)
	      VALUES ($1, $2, 'Alelo Refeição', 'voucher', 215.00, 'restaurant', 'secondary', '#9ddf2e')
	      ON CONFLICT (id) DO NOTHING`, contasVoucherID, defaultUser)

	exec(`INSERT INTO accounts (id, user_id, name, account_type, opening_balance, icon, tone, dot_color, credit_limit)
	      VALUES ($1, $2, 'Nubank Cartão', 'credit_card', 0, 'credit_card', 'primary', '#8a05be', 5000.00)
	      ON CONFLICT (id) DO NOTHING`, contasCardID, defaultUser)

	// Fatura de 4200 no cartão → saldo -4200 (dívida) e panic alto.
	exec(`INSERT INTO transactions (account_id, user_id, category_id, description, direction, amount, occurred_on)
	      VALUES ($1, $2, 'c0000000-0000-0000-0000-000000000002', 'Fatura', 'expense', 4200.00, date_trunc('month', now())::date + 2)`,
		contasCardID, defaultUser)
}

// sendJSON faz uma requisição autenticada com corpo e devolve o status; se dst != nil
// e a resposta tiver corpo, decodifica nele.
func sendJSON(t *testing.T, method, url, token, body string, dst any) int {
	t.Helper()
	req, err := http.NewRequest(method, url, strings.NewReader(body))
	if err != nil {
		t.Fatalf("montar req %s %s: %v", method, url, err)
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("%s %s: %v", method, url, err)
	}
	defer res.Body.Close()
	if dst != nil {
		if err := json.NewDecoder(res.Body).Decode(dst); err != nil {
			t.Fatalf("decode %s %s: %v", method, url, err)
		}
	}
	return res.StatusCode
}
