package cotacao_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"financial-control/server/internal/cotacao"
)

// fixtureServer serve as respostas reais gravadas em testdata/, roteando por path/query
// como as APIs de verdade (brapi /api/quote, CoinGecko /api/v3/...).
func fixtureServer(t *testing.T) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch {
		case strings.HasPrefix(r.URL.Path, "/api/quote/") && r.URL.Query().Get("range") != "":
			writeFixture(t, w, "brapi_history.json")
		case strings.HasPrefix(r.URL.Path, "/api/quote/"):
			writeFixture(t, w, "brapi_quote.json")
		case r.URL.Path == "/api/v3/simple/price":
			writeFixture(t, w, "coingecko_price.json")
		case strings.HasSuffix(r.URL.Path, "/market_chart"):
			writeFixture(t, w, "coingecko_market_chart.json")
		default:
			t.Errorf("path inesperado no fake: %s", r.URL.Path)
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	t.Cleanup(srv.Close)
	return srv
}

func writeFixture(t *testing.T, w http.ResponseWriter, name string) {
	t.Helper()
	b, err := os.ReadFile("testdata/" + name)
	if err != nil {
		t.Fatalf("lendo fixture %s: %v", name, err)
	}
	_, _ = w.Write(b)
}

func btcID(ticker string) (string, bool) {
	if ticker == "BTC" {
		return "bitcoin", true
	}
	return "", false
}

func TestBrapiUltimosPrecos(t *testing.T) {
	srv := fixtureServer(t)
	b := cotacao.NewBrapi(srv.URL, "tok", srv.Client())

	got, err := b.UltimosPrecos(context.Background(), []string{"PETR4", "VALE3"})
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if got["PETR4"].PriceCents != 3850 {
		t.Errorf("PETR4 = %d centavos, quero 3850", got["PETR4"].PriceCents)
	}
	if got["VALE3"].PriceCents != 6120 {
		t.Errorf("VALE3 = %d centavos, quero 6120", got["VALE3"].PriceCents)
	}
	if got["PETR4"].Source != "brapi" {
		t.Errorf("source = %q, quero brapi", got["PETR4"].Source)
	}
	if got["PETR4"].AsOf.IsZero() {
		t.Error("AsOf não deveria ser zero (regularMarketTime)")
	}
}

func TestBrapiHistoricoUsaCloseNaoAjustadoEFiltraIntervalo(t *testing.T) {
	srv := fixtureServer(t)
	b := cotacao.NewBrapi(srv.URL, "tok", srv.Client())

	de := time.Date(2026, 6, 19, 12, 0, 0, 0, time.UTC)
	ate := time.Date(2026, 6, 22, 12, 0, 0, 0, time.UTC)
	pts, err := b.Historico(context.Background(), "PETR4", de, ate)
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if len(pts) != 2 {
		t.Fatalf("len = %d, quero 2 (terceiro ponto está fora do intervalo)", len(pts))
	}
	// close (não-ajustado) 37.80 e 38.50 — NUNCA o adjustedClose (37.10/37.80).
	if pts[0].PriceCents != 3780 || pts[1].PriceCents != 3850 {
		t.Errorf("preços = %d,%d, quero 3780,3850 (close não-ajustado)", pts[0].PriceCents, pts[1].PriceCents)
	}
	if pts[0].Source != "brapi" {
		t.Errorf("source = %q, quero brapi", pts[0].Source)
	}
}

func TestCoinGeckoUltimosPrecosEmBRL(t *testing.T) {
	srv := fixtureServer(t)
	c := cotacao.NewCoinGecko(srv.URL, "", srv.Client(), btcID)

	got, err := c.UltimosPrecos(context.Background(), []string{"BTC"})
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if got["BTC"].PriceCents != 32476543 {
		t.Errorf("BTC = %d centavos, quero 32476543", got["BTC"].PriceCents)
	}
	if got["BTC"].Source != "coingecko" {
		t.Errorf("source = %q, quero coingecko", got["BTC"].Source)
	}
}

func TestCoinGeckoHistorico(t *testing.T) {
	srv := fixtureServer(t)
	c := cotacao.NewCoinGecko(srv.URL, "", srv.Client(), btcID)

	de := time.Date(2026, 6, 22, 0, 0, 0, 0, time.UTC)
	ate := time.Date(2026, 6, 23, 23, 0, 0, 0, time.UTC)
	pts, err := c.Historico(context.Background(), "BTC", de, ate)
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if len(pts) != 2 {
		t.Fatalf("len = %d, quero 2", len(pts))
	}
	if pts[0].PriceCents != 32000000 || pts[1].PriceCents != 32476543 {
		t.Errorf("preços = %d,%d, quero 32000000,32476543", pts[0].PriceCents, pts[1].PriceCents)
	}
}

func TestResolverMapeiaClasseParaFonte(t *testing.T) {
	acoes := cotacao.NewBrapi("http://x", "", nil)
	cripto := cotacao.NewCoinGecko("http://x", "", nil, btcID)
	r := cotacao.NewResolver(acoes, cripto)

	cases := []struct {
		class string
		want  cotacao.FonteDePreco
		ok    bool
	}{
		{"acoes", acoes, true},
		{"fiis", acoes, true},
		{"cripto", cripto, true},
		{"renda_fixa", nil, false},
		{"qualquer", nil, false},
	}
	for _, tc := range cases {
		got, ok := r.Para(tc.class)
		if ok != tc.ok || got != tc.want {
			t.Errorf("Para(%q) = (%v,%v), quero (%v,%v)", tc.class, got, ok, tc.want, tc.ok)
		}
	}
}

func TestFetchRetentaEm429HonrandoRetryAfter(t *testing.T) {
	var calls int
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		if calls == 1 {
			w.Header().Set("Retry-After", "0")
			w.WriteHeader(http.StatusTooManyRequests)
			return
		}
		writeFixture(t, w, "brapi_quote.json")
	}))
	t.Cleanup(srv.Close)

	b := cotacao.NewBrapi(srv.URL, "tok", srv.Client())
	got, err := b.UltimosPrecos(context.Background(), []string{"PETR4"})
	if err != nil {
		t.Fatalf("erro inesperado após retry: %v", err)
	}
	if calls != 2 {
		t.Errorf("chamadas = %d, quero 2 (1 falha 429 + 1 sucesso)", calls)
	}
	if got["PETR4"].PriceCents != 3850 {
		t.Errorf("PETR4 = %d, quero 3850", got["PETR4"].PriceCents)
	}
}
