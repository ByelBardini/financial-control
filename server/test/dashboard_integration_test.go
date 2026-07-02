//go:build integration

// Estes testes batem no Postgres real e são DESTRUTIVOS (o seed faz TRUNCATE).
// Por isso ficam atrás da build tag `integration` (opt-in explícito), pulam se
// DATABASE_URL não estiver definido, e EXIGEM um banco dedicado cujo nome
// termine em "_test" (applySeed → requireTestDB aborta senão) — assim rodar os
// testes nunca apaga o banco de dev:
//
//	createdb financial_control_test   # uma vez; depois aplique as migrations nele
//	DATABASE_URL=postgres://financial:financial@localhost:5432/financial_control_test?sslmode=disable \
//	  go test -tags integration ./test/...
package test

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"

	"financial-control/server/internal/account"
	"financial-control/server/internal/auth"
	"financial-control/server/internal/contas"
	"financial-control/server/internal/dashboard"
	"financial-control/server/internal/investimentos"
	"financial-control/server/internal/router"
	"financial-control/server/internal/store"
	"financial-control/server/internal/transacoes"
	"financial-control/server/internal/transfers"
)

// itestSecret assina os tokens nos testes de integração (bypassa o config.Load).
const itestSecret = "integration-test-secret-0123456789"

// newServer sobe o router real (com auth) sobre o store informado.
func newServer(t *testing.T, st *store.Store) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(router.New(router.Deps{
		Auth:          auth.NewService(st, auth.NewTokenIssuer(itestSecret), auth.TTLs{Default: time.Hour, Remember: time.Hour}),
		Account:       account.NewService(st),
		Dashboard:     dashboard.NewService(st),
		Contas:        contas.NewService(st),
		Transacoes:    transacoes.NewService(st),
		Investimentos: investimentos.NewService(st),
		Transfers:     transfers.NewService(st),
	}))
	t.Cleanup(srv.Close)
	return srv
}

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

	srv := newServer(t, st)
	token := login(t, srv.URL, "teste@teste.com", "12345")

	t.Run("summary", func(t *testing.T) {
		var bal dashboard.MonthBalance
		getJSON(t, srv.URL+"/dashboard/summary", token, &bal)
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
		getJSON(t, srv.URL+"/dashboard/categories", token, &cats)
		if len(cats) != 3 {
			t.Fatalf("len = %d, quero 3", len(cats))
		}
		if cats[0].Label != "Alimentação" || cats[0].AmountCents != 62000 {
			t.Errorf("top = %q/%d, quero Alimentação/62000", cats[0].Label, cats[0].AmountCents)
		}
	})

	t.Run("este-mes", func(t *testing.T) {
		var em dashboard.EsteMes
		getJSON(t, srv.URL+"/dashboard/este-mes", token, &em)
		if em.SpentPercent != 35 || em.BiggestVillain != "Alimentação" {
			t.Errorf("esteMes = %+v, quero spentPercent 35 / villain Alimentação", em)
		}
	})

	t.Run("diagnosis", func(t *testing.T) {
		var d dashboard.Diagnosis
		getJSON(t, srv.URL+"/dashboard/diagnosis", token, &d)
		if d.Title != "Diagnóstico Pobrify" || d.Body == "" {
			t.Errorf("diagnosis = %+v", d)
		}
	})

	t.Run("accounts", func(t *testing.T) {
		var accs []account.Account
		getJSON(t, srv.URL+"/accounts", token, &accs)
		if len(accs) != 3 {
			t.Fatalf("len = %d, quero 3", len(accs))
		}
		for _, a := range accs {
			if a.Name == "Binance" && a.BalanceCents != 145000 {
				t.Errorf("Binance balanceCents = %d, quero 145000", a.BalanceCents)
			}
		}
	})

	t.Run("investimentos-da-carteira", func(t *testing.T) {
		var inv []dashboard.Investment
		getJSON(t, srv.URL+"/investments", token, &inv)
		if len(inv) == 0 {
			t.Fatal("investments vazio, quero as posições do seed")
		}
		petr := findInvestment(inv, "PETR4")
		if petr == nil || petr.ValueCents != 142500 { // seed: net 150 × R$ 9,50
			t.Errorf("PETR4 = %+v, quero valueCents 142500", petr)
		}

		var summary dashboard.InvestmentsSummary
		getJSON(t, srv.URL+"/dashboard/investments-summary", token, &summary)
		if summary.TotalCents <= 0 {
			t.Errorf("investments-summary totalCents = %d, quero > 0 (carteira do seed)", summary.TotalCents)
		}

		var bal dashboard.MonthBalance
		getJSON(t, srv.URL+"/dashboard/summary", token, &bal)
		if bal.InvestidoCents != summary.TotalCents {
			t.Errorf("investidoCents = %d, quero == totalCents da carteira (%d)", bal.InvestidoCents, summary.TotalCents)
		}
	})
}

// findInvestment acha um ativo da lista do dashboard pelo nome (ticker), ou nil.
func findInvestment(inv []dashboard.Investment, name string) *dashboard.Investment {
	for i := range inv {
		if inv[i].Name == name {
			return &inv[i]
		}
	}
	return nil
}

// requireTestDB aborta o teste se o dsn não apontar para um banco dedicado de
// teste (nome terminando em "_test"). Blindagem contra rodar o seed destrutivo
// (TRUNCATE) no banco de dev/prod — ver docs/context/gotchas.md.
//
//	requireTestDB(t, "postgres://u:p@host/financial_control_test") // ok, não aborta
func requireTestDB(t *testing.T, dsn string) {
	t.Helper()
	u, err := url.Parse(dsn)
	if err != nil {
		t.Fatalf("requireTestDB: DATABASE_URL inválida (%q): %v", dsn, err)
	}
	db := strings.TrimPrefix(u.Path, "/")
	if !strings.HasSuffix(db, "_test") {
		t.Fatalf("requireTestDB: recusando rodar o seed destrutivo no banco %q — os "+
			"testes de integração exigem um banco cujo nome termine em \"_test\" (ex.: "+
			"financial_control_test). Aponte DATABASE_URL para o banco de teste, não o de dev.", db)
	}
}

// applySeed roda o server/db/seed.sql (caminho relativo ao pacote test/).
// O seed é DESTRUTIVO (TRUNCATE): requireTestDB garante que só rode num banco
// dedicado de teste, nunca no de dev/prod.
func applySeed(t *testing.T, ctx context.Context, dsn string) {
	t.Helper()
	requireTestDB(t, dsn)
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

// login pega um token via POST /auth/login (o caminho real do client).
func login(t *testing.T, baseURL, email, password string) string {
	t.Helper()
	body := strings.NewReader(fmt.Sprintf(`{"email":%q,"password":%q,"rememberMe":false}`, email, password))
	res, err := http.Post(baseURL+"/auth/login", "application/json", body)
	if err != nil {
		t.Fatalf("login: %v", err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		t.Fatalf("login %s: status %d, quero 200", email, res.StatusCode)
	}
	var out struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(res.Body).Decode(&out); err != nil {
		t.Fatalf("decode login: %v", err)
	}
	if out.Token == "" {
		t.Fatal("login não devolveu token")
	}
	return out.Token
}

// getJSON faz um GET autenticado (Bearer) e decodifica o corpo em dst.
func getJSON(t *testing.T, url, token string, dst any) {
	t.Helper()
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		t.Fatalf("montar req %s: %v", url, err)
	}
	req.Header.Set("Authorization", "Bearer "+token)
	res, err := http.DefaultClient.Do(req)
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
