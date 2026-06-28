package investimentos_test

import (
	"context"
	"time"

	"financial-control/server/internal/store"
)

// fakeInvestimentosStore é o fake nomeado da dependência de dados (sem banco). Emula o filtro de
// cripto do SQL (include/only) e captura userID + flags pra provar o escopo e a separação. Os
// métodos do recurso CRUD são stubs aqui (exercitados no crud_test).
type fakeInvestimentosStore struct {
	positions []store.PositionRow
	series    []store.CryptoSeriesRow
	err       error

	gotUserID  string
	gotInclude bool
	gotOnly    bool

	// recurso CRUD: controle de retorno + captura de entrada.
	createdID     string
	createErr     error
	updateErr     error
	archiveErr    error
	metaRow       store.AssetMetaRow
	metaErr       error
	posRow        store.PositionRow
	posErr        error
	tradeRows     []store.TradeRow
	recordErr     error
	deleteErr     error
	gotAssetInput store.AssetInput
	gotTrade      store.TradeInput
	gotSide       string
	gotTicker     string
	gotAssetID    string
	gotTradeID    string
	appendCalled  bool
	appendPrice   int64

	// backfill (UpsertDailyPrices): captura + sinal opcional (fechado quando o backfill grava).
	gotBackfill      []store.PricePoint
	gotBackfillUser  string
	gotBackfillAsset string
	backfillDone     chan struct{}

	// leitura: histórico de preço + evolução do patrimônio.
	priceHistory []store.PricePoint
	evolution    []store.EvolutionRow
}

func (f *fakeInvestimentosStore) ListPositions(_ context.Context, userID string, includeCrypto, onlyCrypto bool) ([]store.PositionRow, error) {
	f.gotUserID = userID
	f.gotInclude = includeCrypto
	f.gotOnly = onlyCrypto
	if f.err != nil {
		return nil, f.err
	}
	out := []store.PositionRow{}
	for _, p := range f.positions {
		isCrypto := p.AssetClass == "cripto"
		if onlyCrypto && !isCrypto {
			continue
		}
		if !includeCrypto && isCrypto {
			continue
		}
		out = append(out, p)
	}
	return out, nil
}

func (f *fakeInvestimentosStore) ListCryptoSeries(_ context.Context, userID string) ([]store.CryptoSeriesRow, error) {
	f.gotUserID = userID
	return f.series, f.err
}

// --- Recurso CRUD: captura entrada + devolve o que o teste configurou. ---

func (f *fakeInvestimentosStore) GetAssetPosition(_ context.Context, _, assetID string) (store.PositionRow, error) {
	f.gotAssetID = assetID
	return f.posRow, f.posErr
}

func (f *fakeInvestimentosStore) GetAssetByID(_ context.Context, _, assetID string) (store.AssetMetaRow, error) {
	f.gotAssetID = assetID
	return f.metaRow, f.metaErr
}

func (f *fakeInvestimentosStore) GetAssetNetQuantity(context.Context, string, string) (string, error) {
	return "0", nil
}

func (f *fakeInvestimentosStore) ListTradesByAsset(context.Context, string, string) ([]store.TradeRow, error) {
	return f.tradeRows, nil
}

func (f *fakeInvestimentosStore) CreateAsset(_ context.Context, _ string, in store.AssetInput) (string, error) {
	f.gotAssetInput = in
	return f.createdID, f.createErr
}

func (f *fakeInvestimentosStore) UpdateAsset(_ context.Context, _, _ string, in store.AssetInput) error {
	f.gotAssetInput = in
	return f.updateErr
}

func (f *fakeInvestimentosStore) ArchiveAsset(context.Context, string, string) error {
	return f.archiveErr
}

func (f *fakeInvestimentosStore) AppendPriceObservation(_ context.Context, _, _ string, priceCents int64, _ time.Time) (int64, error) {
	f.appendCalled = true
	f.appendPrice = priceCents
	return 1, nil
}

func (f *fakeInvestimentosStore) UpsertDailyPrices(_ context.Context, userID, assetID string, pts []store.PricePoint) (int64, error) {
	f.gotBackfillUser = userID
	f.gotBackfillAsset = assetID
	f.gotBackfill = pts
	if f.backfillDone != nil {
		close(f.backfillDone)
	}
	return int64(len(pts)), nil
}

func (f *fakeInvestimentosStore) ListPriceHistory(_ context.Context, _, _ string, _, _ time.Time) ([]store.PricePoint, error) {
	return f.priceHistory, f.err
}

func (f *fakeInvestimentosStore) PortfolioEvolution(_ context.Context, _ string, _, _ time.Time) ([]store.EvolutionRow, error) {
	return f.evolution, f.err
}

func (f *fakeInvestimentosStore) RecordTrade(_ context.Context, _, _, side, ticker string, in store.TradeInput) error {
	f.gotSide = side
	f.gotTicker = ticker
	f.gotTrade = in
	return f.recordErr
}

func (f *fakeInvestimentosStore) DeleteTrade(_ context.Context, _, _, tradeID string) error {
	f.gotTradeID = tradeID
	return f.deleteErr
}
