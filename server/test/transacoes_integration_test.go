//go:build integration

package test

import (
	"context"
	"net/http"
	"os"
	"testing"
	"time"

	"financial-control/server/internal/store"
	"financial-control/server/internal/transacoes"
)

// IDs fixos do seed do usuário A (ver db/seed.sql), usados pra criar transações no teste.
const (
	userANubankAcc = "a0000000-0000-0000-0000-000000000001"
	userAFoodCat   = "c0000000-0000-0000-0000-000000000002"
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

	t.Run("list", func(t *testing.T) {
		var txns []transacoes.Transaction
		getJSON(t, srv.URL+"/transacoes/list", token, &txns)
		if len(txns) != 6 {
			t.Fatalf("len = %d, quero 6 transações semeadas", len(txns))
		}
		mercado := findTransaction(txns, "Mercado")
		if mercado == nil {
			t.Fatal("não achei a transação 'Mercado'")
		}
		if mercado.Direction != "outflow" || mercado.AmountCents != 62000 || mercado.AccountLabel != "Nubank" {
			t.Errorf("Mercado = {%q,%d,%q}, quero {outflow,62000,Nubank}", mercado.Direction, mercado.AmountCents, mercado.AccountLabel)
		}
		if mercado.DateLabel == "" || mercado.TimeLabel == "" {
			t.Errorf("labels de data vazios: %+v", mercado)
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
	var txns []transacoes.Transaction
	getJSON(t, srv.URL+"/transacoes/list", tokenA, &txns)
	if findTransaction(txns, "Teste Integração") == nil {
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

// findTransaction acha a transação pelo título (nil se ausente).
func findTransaction(txns []transacoes.Transaction, title string) *transacoes.Transaction {
	for i := range txns {
		if txns[i].Title == title {
			return &txns[i]
		}
	}
	return nil
}
