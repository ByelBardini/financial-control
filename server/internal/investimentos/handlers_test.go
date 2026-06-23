package investimentos_test

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"financial-control/server/internal/auth"
	"financial-control/server/internal/investimentos"
	"financial-control/server/internal/store"
)

// doReq dispara um request autenticado com corpo e path values (o mux preencheria estes).
func doReq(t *testing.T, h http.Handler, method, target, body string, pathVals map[string]string) *httptest.ResponseRecorder {
	t.Helper()
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(method, target, strings.NewReader(body))
	req = req.WithContext(auth.WithUserID(req.Context(), "u-1"))
	for k, v := range pathVals {
		req.SetPathValue(k, v)
	}
	h.ServeHTTP(rec, req)
	return rec
}

// do dispara um GET já autenticado (userID no contexto, como o middleware faria).
func do(t *testing.T, h http.Handler, target string) *httptest.ResponseRecorder {
	t.Helper()
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, target, nil)
	req = req.WithContext(auth.WithUserID(req.Context(), "u-1"))
	h.ServeHTTP(rec, req)
	return rec
}

func assertJSON(t *testing.T, rec *httptest.ResponseRecorder, want string) {
	t.Helper()
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, quero 200", rec.Code)
	}
	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Fatalf("Content-Type = %q", ct)
	}
	if got := rec.Body.String(); got != want+"\n" {
		t.Fatalf("body =\n%q\nquero\n%q", got, want+"\n")
	}
}

func TestPositionsHandlerJSON(t *testing.T) {
	svc := investimentos.NewService(&fakeInvestimentosStore{positions: []store.PositionRow{
		{ID: "petr", Ticker: "PETR4", Name: "Petrobras PN", AssetClass: "acoes", Icon: "local_gas_station", NetQuantity: "150.00000000", CostBasisCents: 165000, CurrentValueCents: 142500, AvgPriceCents: 1100, RealizedCents: 10000},
	}})
	assertJSON(t, do(t, investimentos.PositionsHandler(svc), "/investimentos/positions"),
		`[{"id":"petr","ticker":"PETR4","name":"Petrobras PN","assetClass":"acoes","icon":"local_gas_station","costBasisCents":165000,"currentValueCents":142500,"gainCents":-22500,"gainPct":-13.64,"realizedCents":10000}]`)
}

func TestSummaryHandlerJSONVazio(t *testing.T) {
	svc := investimentos.NewService(&fakeInvestimentosStore{})
	assertJSON(t, do(t, investimentos.SummaryHandler(svc), "/investimentos/summary"),
		`{"totalCents":0,"gainCents":0,"gainPct":0,"title":"Portfólio de Ilusões","quip":"Empatando com o tédio."}`)
}

func TestPositionsListaVaziaArrayJSON(t *testing.T) {
	svc := investimentos.NewService(&fakeInvestimentosStore{})
	if got := do(t, investimentos.PositionsHandler(svc), "/investimentos/positions").Body.String(); got != "[]\n" {
		t.Fatalf("body = %q, quero [] (lista vazia não pode virar null)", got)
	}
}

func TestAllocationListaVaziaArrayJSON(t *testing.T) {
	svc := investimentos.NewService(&fakeInvestimentosStore{})
	if got := do(t, investimentos.AllocationHandler(svc), "/investimentos/allocation").Body.String(); got != "[]\n" {
		t.Fatalf("body = %q, quero []", got)
	}
}

func TestCryptoHandlerJSONVazioHoldingsArray(t *testing.T) {
	svc := investimentos.NewService(&fakeInvestimentosStore{})
	assertJSON(t, do(t, investimentos.CryptoHandler(svc), "/investimentos/crypto"),
		`{"title":"O Circo da Volatilidade","subtotalCents":0,"gainCents":0,"gainPct":0,"holdings":[]}`)
}

func TestViewHandlerSemUsuario401(t *testing.T) {
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/investimentos/summary", nil) // sem userID no contexto
	investimentos.SummaryHandler(investimentos.NewService(&fakeInvestimentosStore{})).ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, quero 401 (sem usuário no contexto)", rec.Code)
	}
}

func TestViewHandlerErroDoStore500(t *testing.T) {
	svc := investimentos.NewService(&fakeInvestimentosStore{err: errors.New("falha no banco")})
	rec := do(t, investimentos.PositionsHandler(svc), "/investimentos/positions")
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, quero 500", rec.Code)
	}
}

func TestCreateAssetHandler201(t *testing.T) {
	fake := &fakeInvestimentosStore{createdID: "new-id", posRow: store.PositionRow{ID: "new-id", Ticker: "WEGE3", Name: "WEG ON", AssetClass: "acoes", Icon: "corporate_fare", CurrentPriceCents: 5000, NetQuantity: "0.00000000"}}
	rec := doReq(t, investimentos.CreateAssetHandler(investimentos.NewService(fake)), http.MethodPost, "/investimentos/assets",
		`{"ticker":"WEGE3","name":"WEG ON","assetClass":"acoes","icon":"corporate_fare","currentPriceCents":5000}`, nil)
	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, quero 201", rec.Code)
	}
}

func TestCreateAssetHandlerClasseInvalida400(t *testing.T) {
	rec := doReq(t, investimentos.CreateAssetHandler(investimentos.NewService(&fakeInvestimentosStore{})), http.MethodPost, "/investimentos/assets",
		`{"ticker":"X","name":"Y","assetClass":"foo","icon":"i","currentPriceCents":0}`, nil)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, quero 400 (assetClass inválido)", rec.Code)
	}
}

func TestGetAssetHandler404(t *testing.T) {
	fake := &fakeInvestimentosStore{posErr: store.ErrAssetNotFound}
	rec := doReq(t, investimentos.GetAssetHandler(investimentos.NewService(fake)), http.MethodGet, "/investimentos/assets/nope", "", map[string]string{"id": "nope"})
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, quero 404", rec.Code)
	}
}

func TestTradeHandlerCompra201(t *testing.T) {
	fake := &fakeInvestimentosStore{
		metaRow: store.AssetMetaRow{ID: "a1", Ticker: "PETR4", AssetClass: "acoes"},
		posRow:  store.PositionRow{ID: "a1", Ticker: "PETR4", NetQuantity: "10.00000000"},
	}
	rec := doReq(t, investimentos.TradeHandler(investimentos.NewService(fake)), http.MethodPost, "/investimentos/assets/a1/trades",
		`{"side":"buy","quantity":"10","unitPriceCents":1000,"tradedOn":"2026-01-15","accountId":"acc-1"}`, map[string]string{"id": "a1"})
	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, quero 201", rec.Code)
	}
	if fake.gotSide != "buy" || fake.gotTrade.AccountID != "acc-1" {
		t.Errorf("liquidação não propagada: side=%q account=%q", fake.gotSide, fake.gotTrade.AccountID)
	}
}

func TestTradeHandlerVendaInsuficiente400(t *testing.T) {
	fake := &fakeInvestimentosStore{metaRow: store.AssetMetaRow{ID: "a1", AssetClass: "acoes"}, recordErr: store.ErrInsufficientQuantity}
	rec := doReq(t, investimentos.TradeHandler(investimentos.NewService(fake)), http.MethodPost, "/investimentos/assets/a1/trades",
		`{"side":"sell","quantity":"999","unitPriceCents":1000,"tradedOn":"2026-01-15","accountId":"acc-1"}`, map[string]string{"id": "a1"})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, quero 400 (venda insuficiente)", rec.Code)
	}
}

func TestTradeHandlerContaInvalida400(t *testing.T) {
	fake := &fakeInvestimentosStore{metaRow: store.AssetMetaRow{ID: "a1", AssetClass: "acoes"}, recordErr: store.ErrTradeAccountInvalid}
	rec := doReq(t, investimentos.TradeHandler(investimentos.NewService(fake)), http.MethodPost, "/investimentos/assets/a1/trades",
		`{"side":"buy","quantity":"1","unitPriceCents":1000,"tradedOn":"2026-01-15","accountId":"acc-x"}`, map[string]string{"id": "a1"})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, quero 400 (conta de liquidação inválida)", rec.Code)
	}
}

func TestTradeHandlerSemConta400(t *testing.T) {
	rec := doReq(t, investimentos.TradeHandler(investimentos.NewService(&fakeInvestimentosStore{})), http.MethodPost, "/investimentos/assets/a1/trades",
		`{"side":"buy","quantity":"1","unitPriceCents":1000,"tradedOn":"2026-01-15"}`, map[string]string{"id": "a1"})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, quero 400 (conta de liquidação obrigatória)", rec.Code)
	}
}

func TestTradeHandlerQuantidadeInvalida400(t *testing.T) {
	rec := doReq(t, investimentos.TradeHandler(investimentos.NewService(&fakeInvestimentosStore{})), http.MethodPost, "/investimentos/assets/a1/trades",
		`{"side":"buy","quantity":"0","unitPriceCents":1000,"tradedOn":"2026-01-15","accountId":"acc-1"}`, map[string]string{"id": "a1"})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, quero 400 (quantidade zero)", rec.Code)
	}
}

func TestDeleteTradeHandler204(t *testing.T) {
	rec := doReq(t, investimentos.DeleteTradeHandler(investimentos.NewService(&fakeInvestimentosStore{})), http.MethodDelete, "/investimentos/assets/a1/trades/t1", "", map[string]string{"id": "a1", "tradeId": "t1"})
	if rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d, quero 204", rec.Code)
	}
}

func TestUpdateAssetHandler200(t *testing.T) {
	fake := &fakeInvestimentosStore{
		metaRow: store.AssetMetaRow{ID: "a1", AssetClass: "acoes", CurrentPriceCents: 5000},
		posRow:  store.PositionRow{ID: "a1", Ticker: "WEGE3", NetQuantity: "0.00000000"},
	}
	rec := doReq(t, investimentos.UpdateAssetHandler(investimentos.NewService(fake)), http.MethodPatch, "/investimentos/assets/a1",
		`{"ticker":"WEGE3","name":"WEG ON","icon":"corporate_fare","currentPriceCents":5200}`, map[string]string{"id": "a1"})
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, quero 200", rec.Code)
	}
	if !fake.appendCalled || fake.appendPrice != 5200 {
		t.Errorf("preço mudou (5000→5200): esperava histórico em 5200 (appendCalled=%v price=%d)", fake.appendCalled, fake.appendPrice)
	}
}

func TestUpdateAssetHandlerCorpoInvalido400(t *testing.T) {
	rec := doReq(t, investimentos.UpdateAssetHandler(investimentos.NewService(&fakeInvestimentosStore{})), http.MethodPatch, "/investimentos/assets/a1",
		`{"ticker":"","name":"WEG ON","icon":"corporate_fare","currentPriceCents":5200}`, map[string]string{"id": "a1"})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, quero 400 (ticker vazio)", rec.Code)
	}
}

func TestUpdateAssetHandler404(t *testing.T) {
	fake := &fakeInvestimentosStore{metaErr: store.ErrAssetNotFound}
	rec := doReq(t, investimentos.UpdateAssetHandler(investimentos.NewService(fake)), http.MethodPatch, "/investimentos/assets/nope",
		`{"ticker":"WEGE3","name":"WEG ON","icon":"corporate_fare","currentPriceCents":5200}`, map[string]string{"id": "nope"})
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, quero 404", rec.Code)
	}
}

func TestArchiveAssetHandler204(t *testing.T) {
	rec := doReq(t, investimentos.ArchiveAssetHandler(investimentos.NewService(&fakeInvestimentosStore{})), http.MethodDelete, "/investimentos/assets/a1", "", map[string]string{"id": "a1"})
	if rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d, quero 204", rec.Code)
	}
}

func TestArchiveAssetHandler404(t *testing.T) {
	fake := &fakeInvestimentosStore{archiveErr: store.ErrAssetNotFound}
	rec := doReq(t, investimentos.ArchiveAssetHandler(investimentos.NewService(fake)), http.MethodDelete, "/investimentos/assets/nope", "", map[string]string{"id": "nope"})
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, quero 404", rec.Code)
	}
}

func TestCreateAssetHandlerJSONInvalido400(t *testing.T) {
	rec := doReq(t, investimentos.CreateAssetHandler(investimentos.NewService(&fakeInvestimentosStore{})), http.MethodPost, "/investimentos/assets",
		`isto não é json`, nil)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, quero 400 (corpo não-JSON)", rec.Code)
	}
}

func TestCreateAssetHandlerCamposInvalidos400(t *testing.T) {
	cases := []struct {
		name string
		body string
	}{
		{"ticker vazio", `{"ticker":"  ","name":"WEG ON","assetClass":"acoes","icon":"corporate_fare","currentPriceCents":5000}`},
		{"name vazio", `{"ticker":"WEGE3","name":"","assetClass":"acoes","icon":"corporate_fare","currentPriceCents":5000}`},
		{"icon vazio", `{"ticker":"WEGE3","name":"WEG ON","assetClass":"acoes","icon":"","currentPriceCents":5000}`},
		{"preço negativo", `{"ticker":"WEGE3","name":"WEG ON","assetClass":"acoes","icon":"corporate_fare","currentPriceCents":-1}`},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rec := doReq(t, investimentos.CreateAssetHandler(investimentos.NewService(&fakeInvestimentosStore{})), http.MethodPost, "/investimentos/assets", tc.body, nil)
			if rec.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, quero 400 (%s)", rec.Code, tc.name)
			}
		})
	}
}

func TestTradeHandlerEntradaInvalida400(t *testing.T) {
	cases := []struct {
		name string
		body string
	}{
		{"data mês/dia inválidos", `{"side":"buy","quantity":"1","unitPriceCents":1000,"tradedOn":"2026-13-32","accountId":"acc-1"}`},
		{"data com separador errado", `{"side":"buy","quantity":"1","unitPriceCents":1000,"tradedOn":"2026/01/15","accountId":"acc-1"}`},
		{"quantidade zero decimal", `{"side":"buy","quantity":"0.0","unitPriceCents":1000,"tradedOn":"2026-01-15","accountId":"acc-1"}`},
		{"quantidade científica", `{"side":"buy","quantity":"1e5","unitPriceCents":1000,"tradedOn":"2026-01-15","accountId":"acc-1"}`},
		{"quantidade 9 casas", `{"side":"buy","quantity":"1.123456789","unitPriceCents":1000,"tradedOn":"2026-01-15","accountId":"acc-1"}`},
		{"side inválido", `{"side":"hold","quantity":"1","unitPriceCents":1000,"tradedOn":"2026-01-15","accountId":"acc-1"}`},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rec := doReq(t, investimentos.TradeHandler(investimentos.NewService(&fakeInvestimentosStore{})), http.MethodPost, "/investimentos/assets/a1/trades", tc.body, map[string]string{"id": "a1"})
			if rec.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, quero 400 (%s)", rec.Code, tc.name)
			}
		})
	}
}
