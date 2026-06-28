//go:build integration

// Integração do ledger de preço diário (migration 00007): bate no Postgres real (DESTRUTIVO — o
// seed faz TRUNCATE) atrás da tag `integration`, e pula sem DATABASE_URL.
//
//	go test -tags integration ./test/...
package test

import (
	"context"
	"os"
	"testing"
	"time"

	"financial-control/server/internal/store"
)

func TestPrecoLedgerDiario(t *testing.T) {
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

	// ListQuotableAssets exclui renda_fixa (SELIC29) e traz as outras classes do seed.
	quotaveis, err := st.ListQuotableAssets(ctx)
	if err != nil {
		t.Fatalf("ListQuotableAssets: %v", err)
	}
	porTicker := make(map[string]store.QuotableAsset, len(quotaveis))
	for _, q := range quotaveis {
		porTicker[q.Ticker] = q
	}
	if _, ok := porTicker["SELIC29"]; ok {
		t.Error("SELIC29 é renda_fixa — não deveria ser cotável")
	}
	for _, want := range []string{"PETR4", "VALE3", "MXRF11", "BTC"} {
		if _, ok := porTicker[want]; !ok {
			t.Errorf("%s deveria estar entre os cotáveis", want)
		}
	}
	petr, ok := porTicker["PETR4"]
	if !ok {
		t.Fatal("PETR4 ausente nos cotáveis")
	}

	d1 := time.Date(2026, 6, 20, 12, 0, 0, 0, time.UTC)
	d2 := time.Date(2026, 6, 21, 12, 0, 0, 0, time.UTC)

	t.Run("backfill grava série diária", func(t *testing.T) {
		n, err := st.UpsertDailyPrices(ctx, petr.UserID, petr.ID, []store.PricePoint{
			{ObservedOn: d1, PriceCents: 1000, Source: "brapi"},
			{ObservedOn: d2, PriceCents: 1010, Source: "brapi"},
		})
		if err != nil {
			t.Fatalf("UpsertDailyPrices: %v", err)
		}
		if n != 2 {
			t.Fatalf("linhas gravadas = %d, quero 2", n)
		}
		hist, err := st.ListPriceHistory(ctx, petr.UserID, petr.ID, d1, d2)
		if err != nil {
			t.Fatalf("ListPriceHistory: %v", err)
		}
		if len(hist) != 2 || hist[0].PriceCents != 1000 || hist[1].PriceCents != 1010 {
			t.Fatalf("histórico = %+v, quero [1000, 1010] cronológico", hist)
		}
		if !hist[0].ObservedOn.Equal(time.Date(2026, 6, 20, 0, 0, 0, 0, time.UTC)) {
			t.Errorf("primeira data = %v, quero 2026-06-20", hist[0].ObservedOn)
		}
	})

	t.Run("upsert do mesmo dia atualiza em vez de duplicar", func(t *testing.T) {
		if _, err := st.UpsertDailyPrices(ctx, petr.UserID, petr.ID, []store.PricePoint{
			{ObservedOn: d1, PriceCents: 1005, Source: "brapi"},
		}); err != nil {
			t.Fatalf("UpsertDailyPrices (re): %v", err)
		}
		hist, err := st.ListPriceHistory(ctx, petr.UserID, petr.ID, d1, d1)
		if err != nil {
			t.Fatalf("ListPriceHistory: %v", err)
		}
		if len(hist) != 1 || hist[0].PriceCents != 1005 {
			t.Fatalf("histórico do dia = %+v, quero 1 ponto = 1005 (idempotente)", hist)
		}
	})

	t.Run("RecordDailyClose grava ponto e atualiza current_price", func(t *testing.T) {
		hoje := time.Date(2026, 6, 22, 12, 0, 0, 0, time.UTC)
		if err := st.RecordDailyClose(ctx, petr.UserID, petr.ID, 1234, hoje, "brapi", time.Now()); err != nil {
			t.Fatalf("RecordDailyClose: %v", err)
		}
		meta, err := st.GetAssetByID(ctx, petr.UserID, petr.ID)
		if err != nil {
			t.Fatalf("GetAssetByID: %v", err)
		}
		if meta.CurrentPriceCents != 1234 {
			t.Errorf("current_price = %d, quero 1234 (cache do último close)", meta.CurrentPriceCents)
		}
		hist, err := st.ListPriceHistory(ctx, petr.UserID, petr.ID, hoje, hoje)
		if err != nil {
			t.Fatalf("ListPriceHistory: %v", err)
		}
		if len(hist) != 1 || hist[0].PriceCents != 1234 {
			t.Fatalf("fechamento de hoje = %+v, quero 1 ponto = 1234", hist)
		}
	})
}
