package investimentos_test

import (
	"context"
	"errors"
	"math"
	"testing"
	"time"

	"financial-control/server/internal/investimentos"
	"financial-control/server/internal/store"
)

func floatEq(a, b float64) bool { return math.Abs(a-b) < 1e-9 }

// generalAndCrypto é a posição derivada de 4 ativos gerais (Ações/FIIs/Renda Fixa) + 1 cripto.
func generalAndCrypto() []store.PositionRow {
	return []store.PositionRow{
		{ID: "petr", Ticker: "PETR4", Name: "Petrobras PN", AssetClass: "acoes", Icon: "local_gas_station", NetQuantity: "150.00000000", CostBasisCents: 165000, CurrentValueCents: 142500, AvgPriceCents: 1100, RealizedCents: 10000},
		{ID: "vale", Ticker: "VALE3", Name: "Vale ON", AssetClass: "acoes", NetQuantity: "30.00000000", CostBasisCents: 210000, CurrentValueCents: 183000},
		{ID: "mxrf", Ticker: "MXRF11", Name: "Maxi Renda FII", AssetClass: "fiis", NetQuantity: "200.00000000", CostBasisCents: 204000, CurrentValueCents: 209000},
		{ID: "selic", Ticker: "SELIC29", Name: "Tesouro Selic", AssetClass: "renda_fixa", NetQuantity: "10.00000000", CostBasisCents: 100000, CurrentValueCents: 102000},
		{ID: "btc", Ticker: "BTC", Name: "Bitcoin", AssetClass: "cripto", NetQuantity: "0.00100000", CostBasisCents: 30000, CurrentValueCents: 34125},
	}
}

func TestSummaryAgregaGeralExcluiCripto(t *testing.T) {
	fake := &fakeInvestimentosStore{positions: generalAndCrypto()}
	got, err := investimentos.NewService(fake).Summary(context.Background(), "u-1")
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if fake.gotUserID != "u-1" {
		t.Errorf("store recebeu userID %q, quero u-1 (escopo)", fake.gotUserID)
	}
	if fake.gotInclude {
		t.Error("resumo deve pedir include_crypto=false (cripto fora do geral)")
	}
	if got.TotalCents != 636500 {
		t.Errorf("total = %d, quero 636500 (cripto fora)", got.TotalCents)
	}
	if got.GainCents != -42500 {
		t.Errorf("gain = %d, quero -42500", got.GainCents)
	}
	if !floatEq(got.GainPct, -6.26) {
		t.Errorf("gainPct = %v, quero -6.26", got.GainPct)
	}
	if got.Title != "Portfólio de Ilusões" || got.Quip == "" {
		t.Errorf("título/quip = %q / %q", got.Title, got.Quip)
	}
}

func TestPositionsMapeiaEOmiteFechadas(t *testing.T) {
	rows := append(generalAndCrypto(), store.PositionRow{
		ID: "oibr", Ticker: "OIBR3", Name: "Oi ON", AssetClass: "acoes",
		NetQuantity: "0.00000000", CostBasisCents: 0, CurrentValueCents: 0, RealizedCents: -5000,
	})
	got, err := investimentos.NewService(&fakeInvestimentosStore{positions: rows}).Positions(context.Background(), "u-1")
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if len(got) != 4 {
		t.Fatalf("len = %d, quero 4 (cripto fora + posição fechada omitida)", len(got))
	}
	if got[0].Ticker != "PETR4" || got[0].GainCents != -22500 || got[0].RealizedCents != 10000 {
		t.Errorf("PETR4 = %+v, quero gain -22500 / realized 10000", got[0])
	}
	for _, p := range got {
		if p.Ticker == "OIBR3" {
			t.Error("posição totalmente vendida não deveria aparecer")
		}
		if p.AssetClass == "cripto" {
			t.Error("cripto não entra nas posições gerais")
		}
	}
}

func TestAllocationSomaPercentEClasses(t *testing.T) {
	got, err := investimentos.NewService(&fakeInvestimentosStore{positions: generalAndCrypto()}).Allocation(context.Background(), "u-1")
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if len(got) != 3 {
		t.Fatalf("len = %d, quero 3 classes (cripto fora)", len(got))
	}
	if got[0].AssetClass != "acoes" || got[0].Label != "Ações" || got[0].Tone != "primary" || got[0].ValueCents != 325500 {
		t.Errorf("acoes = %+v", got[0])
	}
	if got[1].AssetClass != "fiis" || got[1].Label != "FIIs" || got[1].Tone != "secondary" || got[1].ValueCents != 209000 {
		t.Errorf("fiis = %+v", got[1])
	}
	if got[2].AssetClass != "renda_fixa" || got[2].Tone != "neutral" || got[2].ValueCents != 102000 {
		t.Errorf("renda_fixa = %+v", got[2])
	}
	if sum := got[0].Percent + got[1].Percent + got[2].Percent; sum != 100 {
		t.Errorf("soma dos percent = %d, quero 100", sum)
	}
}

func TestCryptoBlocoAParteComSerie(t *testing.T) {
	fake := &fakeInvestimentosStore{
		positions: generalAndCrypto(),
		series: []store.CryptoSeriesRow{
			{AssetID: "btc", ObservedOn: time.Date(2026, 6, 22, 0, 0, 0, 0, time.UTC), PriceCents: 32000000},
			{AssetID: "btc", ObservedOn: time.Date(2026, 6, 23, 0, 0, 0, 0, time.UTC), PriceCents: 34125000},
		},
	}
	got, err := investimentos.NewService(fake).Crypto(context.Background(), "u-1")
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if !fake.gotInclude || !fake.gotOnly {
		t.Error("cripto deve pedir include_crypto=true e only_crypto=true")
	}
	if got.Title != "O Circo da Volatilidade" || got.Subtitle == "" {
		t.Errorf("título/subtítulo = %q / %q", got.Title, got.Subtitle)
	}
	if len(got.Holdings) != 1 {
		t.Fatalf("holdings = %d, quero 1 (só BTC)", len(got.Holdings))
	}
	h := got.Holdings[0]
	if h.Symbol != "BTC" || h.CurrentValueCents != 34125 || h.GainCents != 4125 || !floatEq(h.GainPct, 13.75) {
		t.Errorf("BTC = %+v, quero value 34125 / gain 4125 / pct 13.75", h)
	}
	if len(h.Series) != 2 || h.Series[0].PriceCents != 32000000 || h.Series[1].PriceCents != 34125000 {
		t.Errorf("série = %v, quero priceCents [32000000 34125000]", h.Series)
	}
	if h.Series[0].Date != "2026-06-22" || h.Series[1].Date != "2026-06-23" {
		t.Errorf("datas da série = %q/%q, quero 2026-06-22/2026-06-23", h.Series[0].Date, h.Series[1].Date)
	}
	if got.SubtotalCents != 34125 || got.GainCents != 4125 {
		t.Errorf("subtotal/gain = %d/%d, quero 34125/4125", got.SubtotalCents, got.GainCents)
	}
}

func TestListasVaziasNaoQuebram(t *testing.T) {
	svc := investimentos.NewService(&fakeInvestimentosStore{})
	summary, _ := svc.Summary(context.Background(), "u-1")
	positions, _ := svc.Positions(context.Background(), "u-1")
	alloc, _ := svc.Allocation(context.Background(), "u-1")
	crypto, _ := svc.Crypto(context.Background(), "u-1")
	if summary.TotalCents != 0 {
		t.Errorf("total vazio = %d, quero 0", summary.TotalCents)
	}
	if positions == nil || len(positions) != 0 {
		t.Error("positions deve ser slice não-nil vazia")
	}
	if alloc == nil || len(alloc) != 0 {
		t.Error("allocation deve ser slice não-nil vazia")
	}
	if crypto.Holdings == nil || len(crypto.Holdings) != 0 {
		t.Error("crypto.Holdings deve ser slice não-nil vazia")
	}
	if crypto.Title == "" {
		t.Error("crypto deve manter o título mesmo vazio")
	}
}

// TestSummaryQuipPorLimiar dirige o summaryQuip pelos 4 limiares (via Summary, black-box): o quip
// sai do gainPct = (valor − custo) / custo. Cobre as fronteiras 5.0 e -10.0 (inclusivas no ramo de cima).
func TestSummaryQuipPorLimiar(t *testing.T) {
	cases := []struct {
		name        string
		value, cost int64
		wantPct     float64
		wantQuip    string
	}{
		{"lucro forte (>=5, fronteira)", 105000, 100000, 5.0, "No azul. Aproveite antes que vire vermelho."},
		{"lucro alto", 110000, 100000, 10.0, "No azul. Aproveite antes que vire vermelho."},
		{"empate (0, fronteira)", 100000, 100000, 0.0, "Empatando com o tédio."},
		{"lucro pequeno (<5)", 103000, 100000, 3.0, "Empatando com o tédio."},
		{"queda leve (-10, fronteira)", 90000, 100000, -10.0, "Diversificado entre o tombo e o quase-tombo."},
		{"queda média", 95000, 100000, -5.0, "Diversificado entre o tombo e o quase-tombo."},
		{"sangria (<-10)", 80000, 100000, -20.0, "Sangrando em várias frentes."},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			fake := &fakeInvestimentosStore{positions: []store.PositionRow{
				{ID: "a", Ticker: "X", AssetClass: "acoes", NetQuantity: "1.00000000", CostBasisCents: tc.cost, CurrentValueCents: tc.value},
			}}
			got, err := investimentos.NewService(fake).Summary(context.Background(), "u-1")
			if err != nil {
				t.Fatalf("erro inesperado: %v", err)
			}
			if !floatEq(got.GainPct, tc.wantPct) {
				t.Errorf("gainPct = %v, quero %v", got.GainPct, tc.wantPct)
			}
			if got.Quip != tc.wantQuip {
				t.Errorf("quip = %q, quero %q", got.Quip, tc.wantQuip)
			}
		})
	}
}

// TestSummaryGainPctCustoZero crava a guarda de divisão: custo 0 → gainPct 0 (mesmo com ganho > 0),
// pra não dividir por zero. Cenário de bonificação (recebeu o ativo sem custo).
func TestSummaryGainPctCustoZero(t *testing.T) {
	fake := &fakeInvestimentosStore{positions: []store.PositionRow{
		{ID: "a", Ticker: "X", AssetClass: "acoes", NetQuantity: "1.00000000", CostBasisCents: 0, CurrentValueCents: 5000},
	}}
	got, err := investimentos.NewService(fake).Summary(context.Background(), "u-1")
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if got.GainCents != 5000 || got.GainPct != 0 {
		t.Errorf("custo 0 = {gain %d, pct %v}, quero {5000, 0} (guarda de divisão)", got.GainCents, got.GainPct)
	}
}

// TestCryptoSubtitlePorQuantidade cobre o cryptoSubtitle nos extremos: 0 holdings → vazio (JSON omite),
// 2 holdings → "2 ativos no picadeiro" (plural). O caso 1 já está em TestCryptoBlocoAParteComSerie.
func TestCryptoSubtitlePorQuantidade(t *testing.T) {
	semCripto := &fakeInvestimentosStore{positions: []store.PositionRow{
		{ID: "petr", Ticker: "PETR4", AssetClass: "acoes", NetQuantity: "10.00000000", CostBasisCents: 1000, CurrentValueCents: 1000},
	}}
	got, err := investimentos.NewService(semCripto).Crypto(context.Background(), "u-1")
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if len(got.Holdings) != 0 || got.Subtitle != "" {
		t.Errorf("sem cripto = {holdings %d, subtitle %q}, quero {0, \"\"}", len(got.Holdings), got.Subtitle)
	}

	duasCriptos := &fakeInvestimentosStore{positions: []store.PositionRow{
		{ID: "btc", Ticker: "BTC", AssetClass: "cripto", NetQuantity: "0.50000000", CostBasisCents: 30000, CurrentValueCents: 34000},
		{ID: "eth", Ticker: "ETH", AssetClass: "cripto", NetQuantity: "2.00000000", CostBasisCents: 15000, CurrentValueCents: 13000},
	}}
	got2, err := investimentos.NewService(duasCriptos).Crypto(context.Background(), "u-1")
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if len(got2.Holdings) != 2 || got2.Subtitle != "2 ativos no picadeiro" {
		t.Errorf("2 criptos = {holdings %d, subtitle %q}, quero {2, \"2 ativos no picadeiro\"}", len(got2.Holdings), got2.Subtitle)
	}
}

func TestPropagaErroDoStore(t *testing.T) {
	svc := investimentos.NewService(&fakeInvestimentosStore{err: errors.New("falha no banco")})
	if _, err := svc.Summary(context.Background(), "u-1"); err == nil {
		t.Error("Summary: esperava erro propagado")
	}
	if _, err := svc.Positions(context.Background(), "u-1"); err == nil {
		t.Error("Positions: esperava erro propagado")
	}
	if _, err := svc.Allocation(context.Background(), "u-1"); err == nil {
		t.Error("Allocation: esperava erro propagado")
	}
	if _, err := svc.Crypto(context.Background(), "u-1"); err == nil {
		t.Error("Crypto: esperava erro propagado")
	}
}
