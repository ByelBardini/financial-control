package investimentos_test

import (
	"context"
	"testing"
	"time"

	"financial-control/server/internal/investimentos"
	"financial-control/server/internal/store"
)

func TestPriceHistoryMapeiaDatasEPrecos(t *testing.T) {
	fake := &fakeInvestimentosStore{priceHistory: []store.PricePoint{
		{ObservedOn: time.Date(2026, 6, 20, 0, 0, 0, 0, time.UTC), PriceCents: 1000},
		{ObservedOn: time.Date(2026, 6, 21, 0, 0, 0, 0, time.UTC), PriceCents: 1010},
	}}
	got, err := investimentos.NewService(fake).PriceHistory(context.Background(), "u-1", "a1", "1mo")
	if err != nil {
		t.Fatalf("PriceHistory: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("len = %d, quero 2", len(got))
	}
	if got[0].Date != "2026-06-20" || got[0].PriceCents != 1000 {
		t.Errorf("ponto[0] = %+v, quero {2026-06-20, 1000}", got[0])
	}
	if got[1].Date != "2026-06-21" || got[1].PriceCents != 1010 {
		t.Errorf("ponto[1] = %+v, quero {2026-06-21, 1010}", got[1])
	}
}

func TestEvolutionMapeiaMercadoECusto(t *testing.T) {
	fake := &fakeInvestimentosStore{evolution: []store.EvolutionRow{
		{OnDate: time.Date(2026, 6, 16, 0, 0, 0, 0, time.UTC), MarketValueCents: 240000, CostBasisCents: 220000},
	}}
	got, err := investimentos.NewService(fake).Evolution(context.Background(), "u-1", "6mo")
	if err != nil {
		t.Fatalf("Evolution: %v", err)
	}
	if len(got) != 1 {
		t.Fatalf("len = %d, quero 1", len(got))
	}
	if got[0].Date != "2026-06-16" || got[0].MarketValueCents != 240000 || got[0].CostBasisCents != 220000 {
		t.Errorf("ponto = %+v, quero {2026-06-16, mercado 240000, custo 220000}", got[0])
	}
}
