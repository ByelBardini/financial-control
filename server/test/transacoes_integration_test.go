//go:build integration

package test

import (
	"context"
	"net/http"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"

	"financial-control/server/internal/store"
	"financial-control/server/internal/transacoes"
)

// IDs fixos do seed do usuário A (ver db/seed.sql), usados pra criar transações no teste.
const (
	userANubankAcc    = "a0000000-0000-0000-0000-000000000001"
	userAFoodCat      = "c0000000-0000-0000-0000-000000000002"
	userATransportCat = "c0000000-0000-0000-0000-000000000003"
)

// Bate nos endpoints reais da tela de Transações sobre o seed (DESTRUTIVO: TRUNCATE).
// Reaproveita newServer/login/getJSON/applySeed de dashboard_integration_test.go.
func TestTransacoesEndpointsComSeed(t *testing.T) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		t.Skip("DATABASE_URL não definido; pulando integração (precisa do Postgres)")
	}
	ctx := context.Background()
	applySeed(t, ctx, dsn)
	insertOldTransaction(t, ctx, dsn) // despesa de 40 dias atrás (só pro filtro de período)

	st, err := store.Open(ctx, dsn)
	if err != nil {
		t.Fatalf("store.Open: %v", err)
	}
	defer st.Close()

	srv := newServer(t, st)
	token := login(t, srv.URL, "teste@teste.com", "12345")

	t.Run("summary", func(t *testing.T) {
		var cf transacoes.CashflowSummary
		getJSON(t, srv.URL+"/transacoes/summary", token, &cf)
		if cf.InflowCents != 320000 || cf.OutflowCents != 111550 {
			t.Fatalf("inflow/outflow = %d/%d, quero 320000/111550", cf.InflowCents, cf.OutflowCents)
		}
		if cf.NetBurnCents != 208450 || cf.BurnPercent != 35 {
			t.Errorf("net/burn = %d/%d, quero 208450/35", cf.NetBurnCents, cf.BurnPercent)
		}
		if cf.Collapse.LowLabel != "Tranquilo" || cf.Collapse.HighLabel != "Colapso" {
			t.Errorf("collapse extremos = %q/%q", cf.Collapse.LowLabel, cf.Collapse.HighLabel)
		}
	})

	t.Run("list (default = 30 Dias, exclui a antiga)", func(t *testing.T) {
		var page transacoes.TransactionPage
		getJSON(t, srv.URL+"/transacoes/list", token, &page)
		if page.Total != 6 || page.Page != 1 || page.PageCount != 1 {
			t.Fatalf("envelope = {total %d, page %d, pageCount %d}, quero {6,1,1} (default 30 dias)", page.Total, page.Page, page.PageCount)
		}
		if findTransaction(page.Items, "Compra Antiga") != nil {
			t.Error("Compra Antiga (40 dias) não devia aparecer no default 30 Dias")
		}
		mercado := findTransaction(page.Items, "Mercado")
		if mercado == nil {
			t.Fatal("não achei a transação 'Mercado'")
		}
		if mercado.Direction != "outflow" || mercado.AmountCents != 62000 || mercado.AccountLabel != "Nubank" {
			t.Errorf("Mercado = {%q,%d,%q}, quero {outflow,62000,Nubank}", mercado.Direction, mercado.AmountCents, mercado.AccountLabel)
		}
	})

	t.Run("3 Meses inclui a antiga", func(t *testing.T) {
		var page transacoes.TransactionPage
		getJSON(t, srv.URL+"/transacoes/list?period=3m", token, &page)
		if page.Total != 7 || findTransaction(page.Items, "Compra Antiga") == nil {
			t.Errorf("3 Meses total = %d, quero 7 (inclui a Compra Antiga de 40 dias)", page.Total)
		}
	})

	t.Run("range custom recorta", func(t *testing.T) {
		// Janela [hoje-50, hoje-30]: pega só a Compra Antiga (-40d); as do mês corrente
		// ficam a < 30 dias (acima do teto). Determinístico, independe do dia de hoje.
		from := time.Now().AddDate(0, 0, -50).Format("2006-01-02")
		to := time.Now().AddDate(0, 0, -30).Format("2006-01-02")
		var page transacoes.TransactionPage
		getJSON(t, srv.URL+"/transacoes/list?period=custom&from="+from+"&to="+to, token, &page)
		if page.Total != 1 || findTransaction(page.Items, "Compra Antiga") == nil {
			t.Errorf("custom [%s,%s] total = %d, quero 1 (só a Compra Antiga)", from, to, page.Total)
		}
	})

	t.Run("filtro de categoria (uma)", func(t *testing.T) {
		var page transacoes.TransactionPage
		getJSON(t, srv.URL+"/transacoes/list?category="+userAFoodCat, token, &page)
		if page.Total != 1 || findTransaction(page.Items, "Mercado") == nil {
			t.Errorf("categoria Alimentação total = %d, quero 1 (Mercado)", page.Total)
		}
	})

	t.Run("multi-categoria = OR", func(t *testing.T) {
		// 3 Meses (pra incluir a antiga) + Alimentação OU Transporte: Mercado + Uber + Compra Antiga.
		var page transacoes.TransactionPage
		getJSON(t, srv.URL+"/transacoes/list?period=3m&category="+userAFoodCat+"&category="+userATransportCat, token, &page)
		if page.Total != 3 {
			t.Errorf("multi-categoria OR total = %d, quero 3 (Mercado/Uber/Compra Antiga)", page.Total)
		}
	})

	t.Run("busca q (ILIKE)", func(t *testing.T) {
		var page transacoes.TransactionPage
		getJSON(t, srv.URL+"/transacoes/list?q=fone", token, &page)
		if page.Total != 2 {
			t.Errorf("busca 'fone' total = %d, quero 2 (Fone 1/3 e 2/3)", page.Total)
		}
	})

	t.Run("paginação fora do alcance", func(t *testing.T) {
		// Poucos itens (< pageSize) → a página 2 vem vazia. (A matemática de pageCount/offset
		// é coberta no unit; aqui só confirmo que a página além dos dados não estoura.)
		var page transacoes.TransactionPage
		getJSON(t, srv.URL+"/transacoes/list?page=2", token, &page)
		if len(page.Items) != 0 || page.Page != 2 {
			t.Errorf("page 2 = {items %d, page %d}, quero {0,2}", len(page.Items), page.Page)
		}
	})

	t.Run("categorias", func(t *testing.T) {
		var cats []transacoes.Category
		getJSON(t, srv.URL+"/categories", token, &cats)
		if len(cats) != 4 {
			t.Fatalf("len categorias = %d, quero 4 (Alimentação/Lazer/Salário/Transporte)", len(cats))
		}
		if cats[0].Name != "Alimentação" { // ORDER BY name
			t.Errorf("primeira categoria = %q, quero Alimentação (ordenado por nome)", cats[0].Name)
		}
	})

	t.Run("recurrences", func(t *testing.T) {
		var recs []transacoes.Recurrence
		getJSON(t, srv.URL+"/transacoes/recurrences", token, &recs)
		if len(recs) != 3 {
			t.Fatalf("len = %d, quero 3 recorrências", len(recs))
		}
		if recs[0].Name != "Salário Base" || recs[0].Direction != "inflow" || recs[0].AmountCents != 320000 {
			t.Errorf("primeira (income primeiro) = {%q,%q,%d}, quero {Salário Base,inflow,320000}", recs[0].Name, recs[0].Direction, recs[0].AmountCents)
		}
	})

	t.Run("debts", func(t *testing.T) {
		var debts []transacoes.FutureDebt
		getJSON(t, srv.URL+"/transacoes/debts", token, &debts)
		if len(debts) != 1 {
			t.Fatalf("len = %d, quero 1 grupo de parcelas (Fone)", len(debts))
		}
		d := debts[0]
		if d.Label != "Fone" || d.InstallmentLabel != "Parcela 2/3" || d.Percent != 67 || d.AmountCents != 10000 {
			t.Errorf("dívida = {%q,%q,%d,%d}, quero {Fone,Parcela 2/3,67,10000}", d.Label, d.InstallmentLabel, d.Percent, d.AmountCents)
		}
	})
}

// TestTransacoesWriteFlowEIsolamento exercita o CRUD real: criar muda summary/list (saldo
// é derivado), editar e excluir; e prova o isolamento A×B na escrita (B não cria na conta de A).
func TestTransacoesWriteFlowEIsolamento(t *testing.T) {
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
	today := time.Now().Format("2006-01-02")

	outflow := func(token string) int64 {
		var cf transacoes.CashflowSummary
		getJSON(t, srv.URL+"/transacoes/summary", token, &cf)
		return cf.OutflowCents
	}
	baseline := outflow(tokenA)
	if baseline != 111550 {
		t.Fatalf("baseline outflow = %d, quero 111550 (seed)", baseline)
	}

	// Criar (50,00) → 201; muda o summary (saldo derivado) e aparece no list.
	body := `{"accountId":"` + userANubankAcc + `","categoryId":"` + userAFoodCat + `","description":"Teste Integração","direction":"outflow","amountCents":5000,"occurredOn":"` + today + `"}`
	var created transacoes.TransactionDetail
	if code := sendJSON(t, http.MethodPost, srv.URL+"/transactions", tokenA, body, &created); code != http.StatusCreated {
		t.Fatalf("POST /transactions = %d, quero 201", code)
	}
	if created.ID == "" || created.Direction != "outflow" || created.AmountCents != 5000 {
		t.Fatalf("recurso criado = %+v", created)
	}
	if got := outflow(tokenA); got != baseline+5000 {
		t.Errorf("outflow após criar = %d, quero %d", got, baseline+5000)
	}
	var page transacoes.TransactionPage
	getJSON(t, srv.URL+"/transacoes/list", tokenA, &page)
	if findTransaction(page.Items, "Teste Integração") == nil {
		t.Error("transação criada não apareceu no /transacoes/list")
	}

	// Editar (→ 70,00) → 200; o summary acompanha.
	edit := `{"categoryId":"` + userAFoodCat + `","description":"Teste Editado","direction":"outflow","amountCents":7000,"occurredOn":"` + today + `"}`
	if code := sendJSON(t, http.MethodPatch, srv.URL+"/transactions/"+created.ID, tokenA, edit, nil); code != http.StatusOK {
		t.Fatalf("PATCH = %d, quero 200", code)
	}
	if got := outflow(tokenA); got != baseline+7000 {
		t.Errorf("outflow após editar = %d, quero %d", got, baseline+7000)
	}

	// Excluir → 204; volta ao baseline e o GET vira 404.
	if code := sendJSON(t, http.MethodDelete, srv.URL+"/transactions/"+created.ID, tokenA, "", nil); code != http.StatusNoContent {
		t.Fatalf("DELETE = %d, quero 204", code)
	}
	if got := outflow(tokenA); got != baseline {
		t.Errorf("outflow após excluir = %d, quero %d (baseline)", got, baseline)
	}
	if code := sendJSON(t, http.MethodGet, srv.URL+"/transactions/"+created.ID, tokenA, "", nil); code != http.StatusNotFound {
		t.Fatalf("GET transação excluída = %d, quero 404", code)
	}

	// A×B: B não pode criar transação na conta de A (não é dona) → 400, sem vazar.
	if code := sendJSON(t, http.MethodPost, srv.URL+"/transactions", tokenB, body, nil); code != http.StatusBadRequest {
		t.Fatalf("B criando na conta de A = %d, quero 400", code)
	}
	if got := outflow(tokenA); got != baseline {
		t.Errorf("outflow de A mudou após a tentativa de B (%d) — VAZAMENTO", got)
	}
}

// insertOldTransaction insere uma despesa de 40 dias atrás (fora do mês corrente e do
// filtro "30 Dias") na conta/categoria do seed, pra exercitar o filtro de período SEM
// tocar no seed.sql compartilhado (outros testes dependem dos saldos de lá).
func insertOldTransaction(t *testing.T, ctx context.Context, dsn string) {
	t.Helper()
	conn, err := pgx.Connect(ctx, dsn)
	if err != nil {
		t.Fatalf("pgx.Connect: %v", err)
	}
	defer conn.Close(ctx)
	if _, err := conn.Exec(ctx, `INSERT INTO transactions
		(account_id, user_id, category_id, description, direction, amount, occurred_on)
		VALUES ($1, '00000000-0000-0000-0000-000000000001', $2, 'Compra Antiga', 'expense', 70.00, (now() - interval '40 days')::date)`,
		userANubankAcc, "c0000000-0000-0000-0000-000000000003"); err != nil {
		t.Fatalf("inserir transação antiga: %v", err)
	}
}

// findTransaction acha a transação pelo título (nil se ausente).
func findTransaction(txns []transacoes.Transaction, title string) *transacoes.Transaction {
	for i := range txns {
		if txns[i].Title == title {
			return &txns[i]
		}
	}
	return nil
}
