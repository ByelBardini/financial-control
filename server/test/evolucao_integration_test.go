//go:build integration

// Integração da evolução do patrimônio (forward-fill + custo médio por data). Usa um usuário
// dedicado (sem ruído do seed) com operações e preços controlados, e crava os valores derivados.
//
//	go test -tags integration ./test/...
package test

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"financial-control/server/internal/store"
)

func TestPortfolioEvolutionForwardFill(t *testing.T) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		t.Skip("DATABASE_URL não definido; pulando integração (precisa do Postgres)")
	}
	ctx := context.Background()
	applySeed(t, ctx, dsn) // garante schema + limpa

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatalf("pgxpool: %v", err)
	}
	defer pool.Close()

	// Usuário dedicado: isola o portfólio (a evolução soma TODOS os ativos não-cripto do user).
	const uid = "ef000000-0000-0000-0000-000000000001"
	// idempotente: o seed trunca os investment_* mas não users — o user dedicado sobrevive a re-runs.
	if _, err := pool.Exec(ctx, `INSERT INTO users (id, email, password_hash) VALUES ($1, 'evol@test.local', 'x') ON CONFLICT (id) DO NOTHING`, uid); err != nil {
		t.Fatalf("inserir user: %v", err)
	}

	st, err := store.Open(ctx, dsn)
	if err != nil {
		t.Fatalf("store.Open: %v", err)
	}
	defer st.Close()

	aid, err := st.CreateAsset(ctx, uid, store.AssetInput{Ticker: "EVOL1", Name: "Evolução", AssetClass: "acoes"})
	if err != nil {
		t.Fatalf("CreateAsset: %v", err)
	}

	// Operações (account_id NULL = sem caixa) via SQL direto, datas controladas.
	if _, err := pool.Exec(ctx, `
		INSERT INTO investment_trades (user_id, asset_id, side, quantity, unit_price, traded_on)
		VALUES ($1,$2,'buy',100,10.00,'2026-06-10'),
		       ($1,$2,'buy',100,12.00,'2026-06-15')`, uid, aid); err != nil {
		t.Fatalf("inserir trades: %v", err)
	}

	// Preços com lacunas (fim de semana 13-14 + dia 16 sem cotação) — testa forward-fill.
	d := func(y, m, day int) time.Time { return time.Date(y, time.Month(m), day, 12, 0, 0, 0, time.UTC) }
	if _, err := st.UpsertDailyPrices(ctx, uid, aid, []store.PricePoint{
		{ObservedOn: d(2026, 6, 10), PriceCents: 1000, Source: "brapi"},
		{ObservedOn: d(2026, 6, 15), PriceCents: 1200, Source: "brapi"},
		{ObservedOn: d(2026, 6, 17), PriceCents: 1300, Source: "brapi"},
	}); err != nil {
		t.Fatalf("UpsertDailyPrices: %v", err)
	}

	pts, err := st.PortfolioEvolution(ctx, uid, d(2026, 6, 10), d(2026, 6, 18))
	if err != nil {
		t.Fatalf("PortfolioEvolution: %v", err)
	}
	porDia := make(map[string]store.EvolutionRow, len(pts))
	for _, p := range pts {
		porDia[p.OnDate.Format("2006-01-02")] = p
	}
	if len(pts) != 9 {
		t.Fatalf("len = %d, quero 9 dias (10..18)", len(pts))
	}

	// dia, market esperado, cost esperado (centavos)
	casos := []struct {
		dia    string
		market int64
		cost   int64
	}{
		{"2026-06-12", 100000, 100000}, // só buy1 (qty 100); preço forward-fill 10,00
		{"2026-06-15", 240000, 220000}, // após buy2 (qty 200, custo 2200); preço 12,00 → 200×12
		{"2026-06-16", 240000, 220000}, // sem cotação → forward-fill 12,00
		{"2026-06-18", 260000, 220000}, // forward-fill 13,00 → 200×13; custo segue 2200
	}
	for _, c := range casos {
		got, ok := porDia[c.dia]
		if !ok {
			t.Errorf("%s ausente na série", c.dia)
			continue
		}
		if got.MarketValueCents != c.market || got.CostBasisCents != c.cost {
			t.Errorf("%s = mercado %d / custo %d, quero %d / %d", c.dia, got.MarketValueCents, got.CostBasisCents, c.market, c.cost)
		}
	}
}

// Sem nenhum preço no ledger, o valor de mercado cai no current_price (manual) em vez de zerar —
// assim a linha de mercado bate com a tabela de posições (que usa current_price).
func TestPortfolioEvolutionFallbackCurrentPrice(t *testing.T) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		t.Skip("DATABASE_URL não definido; pulando integração (precisa do Postgres)")
	}
	ctx := context.Background()
	applySeed(t, ctx, dsn)

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatalf("pgxpool: %v", err)
	}
	defer pool.Close()

	const uid = "ef000000-0000-0000-0000-000000000002"
	if _, err := pool.Exec(ctx, `INSERT INTO users (id, email, password_hash) VALUES ($1, 'evol2@test.local', 'x') ON CONFLICT (id) DO NOTHING`, uid); err != nil {
		t.Fatalf("inserir user: %v", err)
	}

	st, err := store.Open(ctx, dsn)
	if err != nil {
		t.Fatalf("store.Open: %v", err)
	}
	defer st.Close()

	// Ativo COM current_price (R$ 15,00) e SEM nenhuma linha em investment_prices.
	aid, err := st.CreateAsset(ctx, uid, store.AssetInput{Ticker: "EVOL2", Name: "Sem ledger", AssetClass: "acoes", CurrentPriceCents: 1500})
	if err != nil {
		t.Fatalf("CreateAsset: %v", err)
	}
	if _, err := pool.Exec(ctx, `
		INSERT INTO investment_trades (user_id, asset_id, side, quantity, unit_price, traded_on)
		VALUES ($1,$2,'buy',100,10.00,'2026-06-10')`, uid, aid); err != nil {
		t.Fatalf("inserir trade: %v", err)
	}

	d := func(day int) time.Time { return time.Date(2026, 6, day, 12, 0, 0, 0, time.UTC) }
	pts, err := st.PortfolioEvolution(ctx, uid, d(10), d(12))
	if err != nil {
		t.Fatalf("PortfolioEvolution: %v", err)
	}
	for _, p := range pts {
		// mercado = 100 × R$15,00 (current_price) = 150000c; custo = 100 × R$10,00 = 100000c.
		if p.MarketValueCents != 150000 || p.CostBasisCents != 100000 {
			t.Errorf("%s = mercado %d / custo %d, quero 150000 / 100000 (fallback current_price)", p.OnDate.Format("2006-01-02"), p.MarketValueCents, p.CostBasisCents)
		}
	}
}
