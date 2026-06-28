package investimentos_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"financial-control/server/internal/cotacao"
	"financial-control/server/internal/investimentos"
	"financial-control/server/internal/store"
)

// fakeCotador emula o provedor de cotação no backfill. `done` é fechado ao fim de Historico
// (sucesso ou erro) — o teste espera nele pra não correr atrás da goroutine.
type fakeCotador struct {
	pts  []cotacao.PontoDePreco
	err  error
	done chan struct{}

	gotTicker string
	gotClass  string
}

func (f *fakeCotador) Historico(_ context.Context, ticker, class string, _, _ time.Time) ([]cotacao.PontoDePreco, error) {
	f.gotTicker = ticker
	f.gotClass = class
	if f.done != nil {
		defer close(f.done)
	}
	return f.pts, f.err
}

func TestCreateAssetBackfillAssincronoGravaHistorico(t *testing.T) {
	done := make(chan struct{})
	fake := &fakeInvestimentosStore{
		createdID:    "a1",
		posRow:       store.PositionRow{ID: "a1", Ticker: "PETR4", AssetClass: "acoes"},
		backfillDone: done,
	}
	cot := &fakeCotador{pts: []cotacao.PontoDePreco{
		{ObservedOn: time.Date(2026, 6, 20, 0, 0, 0, 0, time.UTC), PriceCents: 1000, Source: "brapi"},
		{ObservedOn: time.Date(2026, 6, 21, 0, 0, 0, 0, time.UTC), PriceCents: 1010, Source: "brapi"},
	}}
	svc := investimentos.NewService(fake, investimentos.ComBackfill(cot))

	if _, err := svc.CreateAsset(context.Background(), "u-1", investimentos.CreateAssetInput{
		Ticker: "PETR4", Name: "Petrobras", AssetClass: "acoes", Icon: "x",
	}); err != nil {
		t.Fatalf("CreateAsset: %v", err)
	}

	select {
	case <-done: // backfill gravou (happens-before garante leitura segura abaixo)
	case <-time.After(2 * time.Second):
		t.Fatal("backfill não rodou em 2s")
	}
	if fake.gotBackfillUser != "u-1" || fake.gotBackfillAsset != "a1" {
		t.Errorf("backfill no alvo errado: user=%q asset=%q", fake.gotBackfillUser, fake.gotBackfillAsset)
	}
	if len(fake.gotBackfill) != 2 || fake.gotBackfill[0].PriceCents != 1000 || fake.gotBackfill[1].Source != "brapi" {
		t.Errorf("pontos convertidos = %+v, quero 2 (1000/1010, source brapi)", fake.gotBackfill)
	}
}

func TestCreateAssetNaoFalhaQuandoBackfillErra(t *testing.T) {
	done := make(chan struct{})
	fake := &fakeInvestimentosStore{createdID: "a1", posRow: store.PositionRow{ID: "a1", Ticker: "X", AssetClass: "acoes"}}
	cot := &fakeCotador{err: errors.New("brapi fora do ar"), done: done}
	svc := investimentos.NewService(fake, investimentos.ComBackfill(cot))

	got, err := svc.CreateAsset(context.Background(), "u-1", investimentos.CreateAssetInput{
		Ticker: "X", Name: "X", AssetClass: "acoes", Icon: "x",
	})
	if err != nil {
		t.Fatalf("CreateAsset não deveria falhar por backfill: %v", err)
	}
	if got.ID != "a1" {
		t.Errorf("detalhe devolvido = %q, quero a1", got.ID)
	}
	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("goroutine de backfill não rodou")
	}
	if fake.gotBackfill != nil {
		t.Errorf("erro no provedor não deveria gravar nada, got %+v", fake.gotBackfill)
	}
}

func TestBackfillExistentesContaCotaveisExcluindoRendaFixa(t *testing.T) {
	fake := &fakeInvestimentosStore{positions: []store.PositionRow{
		{ID: "p", Ticker: "PETR4", AssetClass: "acoes"},
		{ID: "m", Ticker: "MXRF11", AssetClass: "fiis"},
		{ID: "s", Ticker: "SELIC29", AssetClass: "renda_fixa"},
		{ID: "b", Ticker: "BTC", AssetClass: "cripto"},
	}}
	cot := &fakeCotador{} // Historico devolve nil → backfillPreco sai cedo (não toca o store)
	svc := investimentos.NewService(fake, investimentos.ComBackfill(cot))

	n, err := svc.BackfillExistentes(context.Background(), "u-1")
	if err != nil {
		t.Fatalf("BackfillExistentes: %v", err)
	}
	if n != 3 {
		t.Errorf("ativos na fila = %d, quero 3 (exclui renda_fixa)", n)
	}
}

func TestBackfillExistentesSemCotadorNaoFazNada(t *testing.T) {
	fake := &fakeInvestimentosStore{positions: []store.PositionRow{
		{ID: "p", Ticker: "PETR4", AssetClass: "acoes"},
	}}
	svc := investimentos.NewService(fake) // sem ComBackfill

	n, err := svc.BackfillExistentes(context.Background(), "u-1")
	if err != nil {
		t.Fatalf("BackfillExistentes: %v", err)
	}
	if n != 0 {
		t.Errorf("sem cotador deveria devolver 0, veio %d", n)
	}
}

func TestCreateAssetSemCotadorNaoFazBackfill(t *testing.T) {
	fake := &fakeInvestimentosStore{createdID: "a1", posRow: store.PositionRow{ID: "a1", Ticker: "X", AssetClass: "acoes"}}
	svc := investimentos.NewService(fake) // sem ComBackfill

	if _, err := svc.CreateAsset(context.Background(), "u-1", investimentos.CreateAssetInput{
		Ticker: "X", Name: "X", AssetClass: "acoes", Icon: "x",
	}); err != nil {
		t.Fatalf("CreateAsset: %v", err)
	}
	if fake.gotBackfill != nil {
		t.Errorf("sem cotador não deveria chamar backfill, got %+v", fake.gotBackfill)
	}
}
