//go:build integration

// Estes testes batem no Postgres real e são DESTRUTIVOS (o seed faz TRUNCATE).
// Por isso ficam atrás da build tag `integration` (opt-in explícito) e ainda
// pulam se DATABASE_URL não estiver definido:
//
//	go test -tags integration ./test/...
package test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/jackc/pgx/v5"

	"financial-control/server/internal/account"
	"financial-control/server/internal/dashboard"
	"financial-control/server/internal/router"
	"financial-control/server/internal/store"
)

func TestDashboardEndpointsComSeed(t *testing.T) {
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

	srv := httptest.NewServer(router.New(router.Deps{
		Account:   account.NewService(st),
		Dashboard: dashboard.NewService(st),
	}))
	defer srv.Close()

	t.Run("summary", func(t *testing.T) {
		var bal dashboard.MonthBalance
		getJSON(t, srv.URL+"/dashboard/summary", &bal)
		if bal.ReceitasCents != 320000 || bal.GastosCents != 111550 {
			t.Fatalf("receitas/gastos = %d/%d, quero 320000/111550", bal.ReceitasCents, bal.GastosCents)
		}
		if bal.NetCents != bal.ReceitasCents-bal.GastosCents {
			t.Errorf("netCents = %d, quero %d", bal.NetCents, bal.ReceitasCents-bal.GastosCents)
		}
		if bal.StatusLabel != "No controle" {
			t.Errorf("statusLabel = %q, quero No controle", bal.StatusLabel)
		}
	})

	t.Run("categories", func(t *testing.T) {
		var cats []dashboard.CategorySpend
		getJSON(t, srv.URL+"/dashboard/categories", &cats)
		if len(cats) != 3 {
			t.Fatalf("len = %d, quero 3", len(cats))
		}
		if cats[0].Label != "Alimentação" || cats[0].AmountCents != 62000 {
			t.Errorf("top = %q/%d, quero Alimentação/62000", cats[0].Label, cats[0].AmountCents)
		}
	})

	t.Run("este-mes", func(t *testing.T) {
		var em dashboard.EsteMes
		getJSON(t, srv.URL+"/dashboard/este-mes", &em)
		if em.SpentPercent != 35 || em.BiggestVillain != "Alimentação" {
			t.Errorf("esteMes = %+v, quero spentPercent 35 / villain Alimentação", em)
		}
	})

	t.Run("diagnosis", func(t *testing.T) {
		var d dashboard.Diagnosis
		getJSON(t, srv.URL+"/dashboard/diagnosis", &d)
		if d.Title != "Diagnóstico Pobrify" || d.Body == "" {
			t.Errorf("diagnosis = %+v", d)
		}
	})

	t.Run("accounts", func(t *testing.T) {
		var accs []account.Account
		getJSON(t, srv.URL+"/accounts", &accs)
		if len(accs) != 3 {
			t.Fatalf("len = %d, quero 3", len(accs))
		}
		for _, a := range accs {
			if a.Name == "Binance" && a.BalanceCents != 145000 {
				t.Errorf("Binance balanceCents = %d, quero 145000", a.BalanceCents)
			}
		}
	})

	t.Run("stubs-deferidos", func(t *testing.T) {
		var inv []dashboard.Investment
		getJSON(t, srv.URL+"/investments", &inv)
		if len(inv) != 0 {
			t.Errorf("investments = %v, quero vazio", inv)
		}
		var tk dashboard.Ticker
		getJSON(t, srv.URL+"/dashboard/ticker", &tk)
		if tk.Name != "Bitcoin" || tk.PriceCents != 0 {
			t.Errorf("ticker = %+v", tk)
		}
	})
}

// applySeed roda o server/db/seed.sql (caminho relativo ao pacote test/).
func applySeed(t *testing.T, ctx context.Context, dsn string) {
	t.Helper()
	sql, err := os.ReadFile("../db/seed.sql")
	if err != nil {
		t.Fatalf("lendo seed.sql: %v", err)
	}
	conn, err := pgx.Connect(ctx, dsn)
	if err != nil {
		t.Fatalf("pgx.Connect: %v", err)
	}
	defer conn.Close(ctx)
	if _, err := conn.Exec(ctx, string(sql)); err != nil {
		t.Fatalf("aplicando seed: %v", err)
	}
}

func getJSON(t *testing.T, url string, dst any) {
	t.Helper()
	res, err := http.Get(url)
	if err != nil {
		t.Fatalf("GET %s: %v", url, err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		t.Fatalf("GET %s: status %d", url, res.StatusCode)
	}
	if err := json.NewDecoder(res.Body).Decode(dst); err != nil {
		t.Fatalf("decode %s: %v", url, err)
	}
}
