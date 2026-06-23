package investimentos_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"financial-control/server/internal/investimentos"
	"financial-control/server/internal/store"
)

func TestCreateAssetMapeiaInputEDevolveDetalhe(t *testing.T) {
	fake := &fakeInvestimentosStore{
		createdID: "new-id",
		posRow:    store.PositionRow{ID: "new-id", Ticker: "WEGE3", Name: "WEG ON", AssetClass: "acoes", Icon: "corporate_fare", CurrentPriceCents: 5000, NetQuantity: "0.00000000"},
	}
	got, err := investimentos.NewService(fake).CreateAsset(context.Background(), "u-1", investimentos.CreateAssetInput{
		Ticker: "WEGE3", Name: "WEG ON", AssetClass: "acoes", Icon: "corporate_fare", CurrentPriceCents: 5000,
	})
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if fake.gotAssetInput.Ticker != "WEGE3" || fake.gotAssetInput.AssetClass != "acoes" || fake.gotAssetInput.CurrentPriceCents != 5000 {
		t.Errorf("input pro store = %+v", fake.gotAssetInput)
	}
	if got.ID != "new-id" || got.Ticker != "WEGE3" || got.Trades == nil || len(got.Trades) != 0 {
		t.Errorf("detalhe = %+v (trades deve ser slice não-nil vazia)", got)
	}
}

func TestTradeBuyPassaInputParseado(t *testing.T) {
	fake := &fakeInvestimentosStore{
		metaRow: store.AssetMetaRow{ID: "a1", Ticker: "PETR4", AssetClass: "acoes"},
		posRow:  store.PositionRow{ID: "a1", Ticker: "PETR4", NetQuantity: "100.50000000"},
	}
	_, err := investimentos.NewService(fake).Trade(context.Background(), "u-1", "a1", investimentos.CreateTradeInput{
		Side: "buy", Quantity: "100.5", UnitPriceCents: 1000, TradedOn: "2026-01-15", AccountId: "acc-1",
	})
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if fake.gotSide != "buy" || fake.gotTicker != "PETR4" {
		t.Errorf("side/ticker pro store = %q/%q, quero buy/PETR4", fake.gotSide, fake.gotTicker)
	}
	if fake.gotTrade.Quantity != "100.5" || fake.gotTrade.UnitPriceCents != 1000 || fake.gotTrade.AccountID != "acc-1" {
		t.Errorf("trade input pro store = %+v", fake.gotTrade)
	}
	if fake.gotTrade.TradedOn.Format("2006-01-02") != "2026-01-15" {
		t.Errorf("data parseada = %v, quero 2026-01-15", fake.gotTrade.TradedOn)
	}
}

func TestTradeSellInsuficienteRetornaErro(t *testing.T) {
	fake := &fakeInvestimentosStore{
		metaRow:   store.AssetMetaRow{ID: "a1", AssetClass: "acoes"}, // ativo existe → não é 404
		recordErr: store.ErrInsufficientQuantity,                     // guarda de saldo barrou
	}
	_, err := investimentos.NewService(fake).Trade(context.Background(), "u-1", "a1", investimentos.CreateTradeInput{
		Side: "sell", Quantity: "999", UnitPriceCents: 1000, TradedOn: "2026-01-15", AccountId: "acc-1",
	})
	if !errors.Is(err, store.ErrInsufficientQuantity) {
		t.Errorf("erro = %v, quero ErrInsufficientQuantity (vira 400)", err)
	}
}

func TestTradeContaInvalidaRetornaErro(t *testing.T) {
	fake := &fakeInvestimentosStore{
		metaRow:   store.AssetMetaRow{ID: "a1", AssetClass: "acoes"}, // ativo existe → não é 404
		recordErr: store.ErrTradeAccountInvalid,                      // conta de liquidação inválida
	}
	_, err := investimentos.NewService(fake).Trade(context.Background(), "u-1", "a1", investimentos.CreateTradeInput{
		Side: "buy", Quantity: "1", UnitPriceCents: 1000, TradedOn: "2026-01-15", AccountId: "acc-x",
	})
	if !errors.Is(err, store.ErrTradeAccountInvalid) {
		t.Errorf("erro = %v, quero ErrTradeAccountInvalid (vira 400)", err)
	}
}

func TestTradeAtivoInexistenteRetorna404(t *testing.T) {
	fake := &fakeInvestimentosStore{metaErr: store.ErrAssetNotFound}
	_, err := investimentos.NewService(fake).Trade(context.Background(), "u-1", "nope", investimentos.CreateTradeInput{
		Side: "buy", Quantity: "1", UnitPriceCents: 1000, TradedOn: "2026-01-15",
	})
	if !errors.Is(err, store.ErrAssetNotFound) {
		t.Errorf("erro = %v, quero ErrAssetNotFound (vira 404)", err)
	}
}

func TestUpdateAssetGravaHistoricoSoQuandoPrecoMuda(t *testing.T) {
	changed := &fakeInvestimentosStore{
		metaRow: store.AssetMetaRow{ID: "a1", AssetClass: "acoes", CurrentPriceCents: 1000},
		posRow:  store.PositionRow{ID: "a1", Ticker: "PETR4", NetQuantity: "0.00000000"},
	}
	if _, err := investimentos.NewService(changed).UpdateAsset(context.Background(), "u-1", "a1", investimentos.UpdateAssetInput{
		Ticker: "PETR4", Name: "Petrobras", Icon: "local_gas_station", CurrentPriceCents: 1200,
	}); err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if !changed.appendCalled || changed.appendPrice != 1200 {
		t.Errorf("preço mudou: esperava histórico em 1200 (appendCalled=%v price=%d)", changed.appendCalled, changed.appendPrice)
	}

	same := &fakeInvestimentosStore{
		metaRow: store.AssetMetaRow{ID: "a1", AssetClass: "acoes", CurrentPriceCents: 1000},
		posRow:  store.PositionRow{ID: "a1", NetQuantity: "0.00000000"},
	}
	if _, err := investimentos.NewService(same).UpdateAsset(context.Background(), "u-1", "a1", investimentos.UpdateAssetInput{
		Ticker: "PETR4", Name: "Petrobras", Icon: "local_gas_station", CurrentPriceCents: 1000,
	}); err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if same.appendCalled {
		t.Error("preço igual não deveria gravar histórico")
	}
}

func TestDeleteTradeInexistenteRetorna404(t *testing.T) {
	fake := &fakeInvestimentosStore{deleteErr: store.ErrTradeNotFound}
	err := investimentos.NewService(fake).DeleteTrade(context.Background(), "u-1", "a1", "t-nope")
	if !errors.Is(err, store.ErrTradeNotFound) {
		t.Errorf("erro = %v, quero ErrTradeNotFound", err)
	}
	if fake.gotTradeID != "t-nope" {
		t.Errorf("tradeID capturado = %q, quero t-nope", fake.gotTradeID)
	}
}

func TestArchiveAssetOk(t *testing.T) {
	if err := investimentos.NewService(&fakeInvestimentosStore{}).ArchiveAsset(context.Background(), "u-1", "a1"); err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
}

func TestArchiveAssetInexistenteRetorna404(t *testing.T) {
	fake := &fakeInvestimentosStore{archiveErr: store.ErrAssetNotFound}
	err := investimentos.NewService(fake).ArchiveAsset(context.Background(), "u-1", "nope")
	if !errors.Is(err, store.ErrAssetNotFound) {
		t.Errorf("erro = %v, quero ErrAssetNotFound (vira 404)", err)
	}
}

func TestGetAssetMontaDetalheComOperacoes(t *testing.T) {
	fake := &fakeInvestimentosStore{
		posRow: store.PositionRow{ID: "a1", Ticker: "PETR4", Name: "Petrobras", AssetClass: "acoes", Icon: "local_gas_station", CurrentPriceCents: 950, NetQuantity: "150.00000000", AvgPriceCents: 1100, CostBasisCents: 165000, CurrentValueCents: 142500, RealizedCents: 10000},
		tradeRows: []store.TradeRow{
			{ID: "t1", Side: "buy", Quantity: "100.00000000", UnitPriceCents: 1000, TradedOn: time.Date(2026, 1, 10, 0, 0, 0, 0, time.UTC)},
		},
	}
	got, err := investimentos.NewService(fake).GetAsset(context.Background(), "u-1", "a1")
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if got.NetQuantity != "150.00000000" || got.GainCents != -22500 || got.RealizedCents != 10000 {
		t.Errorf("posição = %+v, quero net 150 / gain -22500 / realized 10000", got.AssetPosition)
	}
	if len(got.Trades) != 1 || got.Trades[0].TradedOn != "2026-01-10" || got.Trades[0].Side != "buy" {
		t.Errorf("operações = %+v", got.Trades)
	}
}

func TestAssetsListaTodosInclCripto(t *testing.T) {
	fake := &fakeInvestimentosStore{positions: generalAndCrypto()}
	got, err := investimentos.NewService(fake).Assets(context.Background(), "u-1")
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if !fake.gotInclude || fake.gotOnly {
		t.Error("Assets deve pedir include_crypto=true e only_crypto=false (todos os ativos)")
	}
	if len(got) != 5 {
		t.Errorf("len = %d, quero 5 (4 gerais + 1 cripto)", len(got))
	}
}
