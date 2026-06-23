//go:build integration

// Integração da carteira de Investimentos: bate no Postgres real (DESTRUTIVO — o seed faz
// TRUNCATE) atrás da tag `integration`, e pula sem DATABASE_URL.
//
//	go test -tags integration ./test/...
package test

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"testing"
	"time"

	"financial-control/server/internal/account"
	"financial-control/server/internal/dashboard"
	"financial-control/server/internal/investimentos"
	"financial-control/server/internal/store"
	"financial-control/server/internal/transacoes"
)

// IDs fixos das contas do seed (ver db/seed.sql) usados na liquidação das operações.
const (
	seedBinanceAcc  = "a0000000-0000-0000-0000-000000000003"
	seedCarteiraAcc = "a0000000-0000-0000-0000-000000000002"
)

func TestInvestimentosEndpointsComSeed(t *testing.T) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		t.Skip("DATABASE_URL não definido; pulando integração (precisa do Postgres)")
	}
	ctx := context.Background()
	applySeed(t, ctx, dsn) // inclui PETR4/VALE3/MXRF11/SELIC29 (geral) + BTC (cripto)

	st, err := store.Open(ctx, dsn)
	if err != nil {
		t.Fatalf("store.Open: %v", err)
	}
	defer st.Close()

	srv := newServer(t, st)
	token := login(t, srv.URL, "teste@teste.com", "12345")

	t.Run("views derivadas do seed", func(t *testing.T) {
		var summary investimentos.PortfolioSummary
		getJSON(t, srv.URL+"/investimentos/summary", token, &summary)
		if summary.TotalCents != 636500 || summary.GainCents != -42500 {
			t.Errorf("summary = {total %d, gain %d}, quero {636500, -42500} (cripto fora)", summary.TotalCents, summary.GainCents)
		}
		if summary.Title == "" || summary.Quip == "" {
			t.Errorf("summary sem título/quip: %+v", summary)
		}

		var positions []investimentos.Position
		getJSON(t, srv.URL+"/investimentos/positions", token, &positions)
		petr := findPosition(positions, "PETR4")
		if petr == nil {
			t.Fatalf("PETR4 não veio nas posições: %+v", positions)
		}
		if petr.CostBasisCents != 165000 || petr.CurrentValueCents != 142500 || petr.GainCents != -22500 || petr.RealizedCents != 10000 {
			t.Errorf("PETR4 = {cost %d, value %d, gain %d, realized %d}, quero {165000,142500,-22500,10000}",
				petr.CostBasisCents, petr.CurrentValueCents, petr.GainCents, petr.RealizedCents)
		}
		for _, p := range positions {
			if p.AssetClass == "cripto" {
				t.Errorf("cripto não pode aparecer nas posições gerais: %+v", p)
			}
		}

		var alloc []investimentos.AllocationSlice
		getJSON(t, srv.URL+"/investimentos/allocation", token, &alloc)
		sum := 0
		for _, a := range alloc {
			sum += a.Percent
			if a.AssetClass == "cripto" {
				t.Errorf("cripto não pode aparecer na alocação: %+v", a)
			}
		}
		if len(alloc) != 3 || sum != 100 {
			t.Errorf("alocação = %d fatias somando %d, quero 3 somando 100", len(alloc), sum)
		}

		var crypto investimentos.CryptoBlock
		getJSON(t, srv.URL+"/investimentos/crypto", token, &crypto)
		if len(crypto.Holdings) != 1 || crypto.Holdings[0].Symbol != "BTC" {
			t.Fatalf("crypto holdings = %+v, quero só BTC", crypto.Holdings)
		}
		if crypto.SubtotalCents != 34125 || len(crypto.Holdings[0].Series) == 0 {
			t.Errorf("crypto = {subtotal %d, série %d pontos}, quero {34125, >0}", crypto.SubtotalCents, len(crypto.Holdings[0].Series))
		}
	})

	t.Run("fluxo e2e: criar → comprar → vender → guarda → excluir", func(t *testing.T) {
		var created investimentos.AssetDetail
		body := `{"ticker":"WEGE3","name":"WEG ON","assetClass":"acoes","icon":"corporate_fare","currentPriceCents":5000}`
		if code := sendJSON(t, http.MethodPost, srv.URL+"/investimentos/assets", token, body, &created); code != http.StatusCreated {
			t.Fatalf("POST /investimentos/assets = %d, quero 201", code)
		}
		if created.ID == "" || created.NetQuantity != "0.00000000" {
			t.Fatalf("ativo criado = %+v, quero net 0", created)
		}
		assetURL := srv.URL + "/investimentos/assets/" + created.ID
		tradesURL := assetURL + "/trades"

		buy(t, tradesURL, token, "100", 1000) // 100 @ 10,00
		buy(t, tradesURL, token, "100", 1200) // 100 @ 12,00

		var afterBuys investimentos.AssetDetail
		getJSON(t, assetURL, token, &afterBuys)
		if afterBuys.NetQuantity != "200.00000000" || afterBuys.AvgPriceCents != 1100 || afterBuys.RealizedCents != 0 {
			t.Errorf("após 2 compras = {net %s, avg %d, realized %d}, quero {200, 1100, 0}",
				afterBuys.NetQuantity, afterBuys.AvgPriceCents, afterBuys.RealizedCents)
		}

		// vende 50 @ 13,00 → realizado (13-11)*50 = 100,00
		var afterSell investimentos.AssetDetail
		if code := sendJSON(t, http.MethodPost, tradesURL, token, `{"side":"sell","quantity":"50","unitPriceCents":1300,"tradedOn":"2026-02-01","accountId":"`+userANubankAcc+`"}`, &afterSell); code != http.StatusCreated {
			t.Fatalf("venda = %d, quero 201", code)
		}
		if afterSell.NetQuantity != "150.00000000" || afterSell.RealizedCents != 10000 || afterSell.AvgPriceCents != 1100 {
			t.Errorf("após venda = {net %s, realized %d, avg %d}, quero {150, 10000, 1100}",
				afterSell.NetQuantity, afterSell.RealizedCents, afterSell.AvgPriceCents)
		}

		// guarda de saldo: vender mais do que tem → 400 (com conta válida, pra isolar a guarda de saldo)
		if code := sendJSON(t, http.MethodPost, tradesURL, token, `{"side":"sell","quantity":"9999","unitPriceCents":1300,"tradedOn":"2026-02-01","accountId":"`+userANubankAcc+`"}`, nil); code != http.StatusBadRequest {
			t.Errorf("venda excessiva = %d, quero 400", code)
		}

		// excluir uma operação → posição recomputa (some a 2ª compra de 100 @ 12)
		if len(afterSell.Trades) != 3 {
			t.Fatalf("esperava 3 operações, tem %d", len(afterSell.Trades))
		}
		var tradeID string
		for _, tr := range afterSell.Trades {
			if tr.Side == "buy" && tr.UnitPriceCents == 1200 {
				tradeID = tr.ID
			}
		}
		if code := sendJSON(t, http.MethodDelete, tradesURL+"/"+tradeID, token, "", nil); code != http.StatusNoContent {
			t.Fatalf("DELETE operação = %d, quero 204", code)
		}
		var afterDelete investimentos.AssetDetail
		getJSON(t, assetURL, token, &afterDelete)
		if len(afterDelete.Trades) != 2 {
			t.Errorf("após excluir, operações = %d, quero 2", len(afterDelete.Trades))
		}

		// 404 ao buscar ativo inexistente.
		if code := sendJSON(t, http.MethodGet, srv.URL+"/investimentos/assets/00000000-0000-0000-0000-0000000000ff", token, "", nil); code != http.StatusNotFound {
			t.Errorf("GET ativo inexistente = %d, quero 404", code)
		}
	})

	t.Run("preço médio móvel com compras e vendas intercaladas (guarda do bug)", func(t *testing.T) {
		var asset investimentos.AssetDetail
		body := `{"ticker":"TEST1","name":"Teste Intercalado","assetClass":"acoes","icon":"category","currentPriceCents":800}`
		if code := sendJSON(t, http.MethodPost, srv.URL+"/investimentos/assets", token, body, &asset); code != http.StatusCreated {
			t.Fatalf("POST asset = %d, quero 201", code)
		}
		assetURL := srv.URL + "/investimentos/assets/" + asset.ID
		tradesURL := assetURL + "/trades"

		// Datas crescentes → ordem buy, buy, sell, buy (intercalado de verdade).
		tradeOn(t, tradesURL, token, "buy", "10", 500, "2026-01-01")   // buy 10 @ 5 → avg 5
		tradeOn(t, tradesURL, token, "buy", "10", 700, "2026-01-02")   // buy 10 @ 7 → avg 6, qtd 20
		tradeOn(t, tradesURL, token, "sell", "15", 1300, "2026-01-03") // sell 15    → avg fica 6, qtd 5
		tradeOn(t, tradesURL, token, "buy", "5", 800, "2026-01-04")    // buy 5 @ 8  → avg (5*6+5*8)/10 = 7,00

		var got investimentos.AssetDetail
		getJSON(t, assetURL, token, &got)
		if got.NetQuantity != "10.00000000" || got.AvgPriceCents != 700 {
			t.Errorf("intercalado = {net %s, avg %d}, quero {10, 700} (a média só das compras daria 640)",
				got.NetQuantity, got.AvgPriceCents)
		}
	})

	t.Run("liquidação em conta: compra debita, venda credita, fora do resumo, delete reverte", func(t *testing.T) {
		var asset investimentos.AssetDetail
		body := `{"ticker":"LIQ1","name":"Ativo Liquidado","assetClass":"acoes","icon":"savings","currentPriceCents":100000}`
		if code := sendJSON(t, http.MethodPost, srv.URL+"/investimentos/assets", token, body, &asset); code != http.StatusCreated {
			t.Fatalf("POST asset = %d, quero 201", code)
		}
		tradesURL := srv.URL + "/investimentos/assets/" + asset.ID + "/trades"
		today := time.Now().Format("2006-01-02")

		binBefore := accountBalanceCents(t, srv.URL, token, seedBinanceAcc)
		cartBefore := accountBalanceCents(t, srv.URL, token, seedCarteiraAcc)
		var sumBefore dashboard.MonthBalance
		getJSON(t, srv.URL+"/dashboard/summary", token, &sumBefore)

		// COMPRA 2 @ 1000,00 debitando a Binance → caixa cai 2000,00 (200000 cents).
		buyBody := fmt.Sprintf(`{"side":"buy","quantity":"2","unitPriceCents":100000,"tradedOn":%q,"accountId":%q}`, today, seedBinanceAcc)
		if code := sendJSON(t, http.MethodPost, tradesURL, token, buyBody, nil); code != http.StatusCreated {
			t.Fatalf("compra = %d, quero 201", code)
		}
		if got := accountBalanceCents(t, srv.URL, token, seedBinanceAcc); got != binBefore-200000 {
			t.Errorf("Binance após compra = %d, quero %d (debitou 200000)", got, binBefore-200000)
		}

		// O aporte NÃO entra no resumo do mês (kind investment é filtrado).
		var sumAfterBuy dashboard.MonthBalance
		getJSON(t, srv.URL+"/dashboard/summary", token, &sumAfterBuy)
		if sumAfterBuy.GastosCents != sumBefore.GastosCents || sumAfterBuy.ReceitasCents != sumBefore.ReceitasCents {
			t.Errorf("resumo mudou após aporte = {gastos %d, receitas %d}, quero {%d, %d} (fora do resumo)",
				sumAfterBuy.GastosCents, sumAfterBuy.ReceitasCents, sumBefore.GastosCents, sumBefore.ReceitasCents)
		}

		// ...mas APARECE no extrato com a etiqueta Investimento.
		var page transacoes.TransactionPage
		getJSON(t, srv.URL+"/transacoes/list", token, &page)
		compra := findTransaction(page.Items, "Compra LIQ1")
		if compra == nil {
			t.Fatalf("não achei 'Compra LIQ1' no extrato")
		}
		if compra.Tag != "Investimento" || compra.Direction != "outflow" || compra.AmountCents != 200000 || compra.AccountLabel != "Binance" {
			t.Errorf("Compra LIQ1 = {tag %q, %q, %d, %q}, quero {Investimento, outflow, 200000, Binance}",
				compra.Tag, compra.Direction, compra.AmountCents, compra.AccountLabel)
		}

		// VENDA 1 @ 1500,00 creditando a Carteira → caixa sobe 1500,00 (150000 cents).
		sellBody := fmt.Sprintf(`{"side":"sell","quantity":"1","unitPriceCents":150000,"tradedOn":%q,"accountId":%q}`, today, seedCarteiraAcc)
		if code := sendJSON(t, http.MethodPost, tradesURL, token, sellBody, nil); code != http.StatusCreated {
			t.Fatalf("venda = %d, quero 201", code)
		}
		if got := accountBalanceCents(t, srv.URL, token, seedCarteiraAcc); got != cartBefore+150000 {
			t.Errorf("Carteira após venda = %d, quero %d (creditou 150000)", got, cartBefore+150000)
		}

		// EXCLUIR a compra reverte o caixa da Binance (cascade da transação ligada).
		var afterSell investimentos.AssetDetail
		getJSON(t, srv.URL+"/investimentos/assets/"+asset.ID, token, &afterSell)
		var buyID string
		for _, tr := range afterSell.Trades {
			if tr.Side == "buy" {
				buyID = tr.ID
			}
		}
		if buyID == "" {
			t.Fatal("não achei a operação de compra pra excluir")
		}
		if code := sendJSON(t, http.MethodDelete, tradesURL+"/"+buyID, token, "", nil); code != http.StatusNoContent {
			t.Fatalf("DELETE compra = %d, quero 204", code)
		}
		if got := accountBalanceCents(t, srv.URL, token, seedBinanceAcc); got != binBefore {
			t.Errorf("Binance após excluir a compra = %d, quero %d (cascade reverteu o caixa)", got, binBefore)
		}
	})
}

func findPosition(ps []investimentos.Position, ticker string) *investimentos.Position {
	for i := range ps {
		if ps[i].Ticker == ticker {
			return &ps[i]
		}
	}
	return nil
}

// tradeOn registra uma operação numa data explícita (a ordem cronológica define o preço médio
// móvel, então a data importa pra reproduzir compras/vendas intercaladas). Liquida na conta
// padrão do seed (Nubank); a liquidação em si é exercitada no subteste dedicado.
func tradeOn(t *testing.T, tradesURL, token, side, qty string, unitPriceCents int64, date string) {
	t.Helper()
	body := fmt.Sprintf(`{"side":%q,"quantity":%q,"unitPriceCents":%d,"tradedOn":%q,"accountId":%q}`,
		side, qty, unitPriceCents, date, userANubankAcc)
	if code := sendJSON(t, http.MethodPost, tradesURL, token, body, nil); code != http.StatusCreated {
		t.Fatalf("%s %s @ %d (%s) = %d, quero 201", side, qty, unitPriceCents, date, code)
	}
}

// accountBalanceCents lê o saldo (derivado) de uma conta do usuário via GET /accounts.
func accountBalanceCents(t *testing.T, baseURL, token, accountID string) int64 {
	t.Helper()
	var accs []account.Account
	getJSON(t, baseURL+"/accounts", token, &accs)
	for _, a := range accs {
		if a.ID == accountID {
			return a.BalanceCents
		}
	}
	t.Fatalf("conta %s não encontrada em /accounts", accountID)
	return 0
}

func buy(t *testing.T, tradesURL, token, qty string, unitPriceCents int64) {
	t.Helper()
	tradeOn(t, tradesURL, token, "buy", qty, unitPriceCents, "2026-01-15")
}
