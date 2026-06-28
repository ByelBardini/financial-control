package cotacao

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// CoinGecko é uma FonteDePreco para cripto via api.coingecko.com, com preços já em
// BRL (vs_currency=brl, sem conversão manual). Traduz o ticker do ativo (ex.: BTC)
// para o id do CoinGecko (ex.: bitcoin) via idDe.
type CoinGecko struct {
	baseURL string
	apiKey  string // chave Demo opcional; vazio usa o tier público sem chave
	http    *http.Client
	idDe    func(ticker string) (string, bool)
}

// NewCoinGecko cria o client. apiKey vazio usa o tier público (limites menores).
// idDe mapeia ticker→id do CoinGecko; tickers sem mapa são ignorados sem erro.
//
//	c := cotacao.NewCoinGecko("https://api.coingecko.com", key, nil, cotacao.IDPadrao)
func NewCoinGecko(baseURL, apiKey string, hc *http.Client, idDe func(string) (string, bool)) *CoinGecko {
	return &CoinGecko{baseURL: strings.TrimRight(baseURL, "/"), apiKey: apiKey, http: httpClient(hc), idDe: idDe}
}

// UltimosPrecos busca o último preço em BRL de vários tickers numa só chamada.
func (c *CoinGecko) UltimosPrecos(ctx context.Context, tickers []string) (map[string]Cotacao, error) {
	out := make(map[string]Cotacao, len(tickers))
	ids, idToTicker := c.resolveIDs(tickers)
	if len(ids) == 0 {
		return out, nil
	}
	q := url.Values{"ids": {strings.Join(ids, ",")}, "vs_currencies": {"brl"}, "include_last_updated_at": {"true"}}
	var resp map[string]struct {
		BRL           json.Number `json:"brl"`
		LastUpdatedAt int64       `json:"last_updated_at"`
	}
	if err := fetchJSON(ctx, c.http, c.url("/api/v3/simple/price", q), "coingecko price", &resp); err != nil {
		return nil, err
	}
	for id, data := range resp {
		cents, err := centsFromDecimal(data.BRL.String())
		if err != nil {
			return nil, fmt.Errorf("coingecko %s: %w", id, err)
		}
		out[idToTicker[id]] = Cotacao{PriceCents: cents, AsOf: time.Unix(data.LastUpdatedAt, 0), Source: "coingecko"}
	}
	return out, nil
}

// Historico devolve a série diária em BRL de um ticker em [de, ate] via market_chart.
func (c *CoinGecko) Historico(ctx context.Context, ticker string, de, ate time.Time) ([]PontoDePreco, error) {
	id, ok := c.idDe(ticker)
	if !ok {
		return nil, nil
	}
	q := url.Values{"vs_currency": {"brl"}, "days": {daysAte(de)}}
	var resp struct {
		Prices [][]json.Number `json:"prices"` // [ [tsMs, preço], ... ]
	}
	u := c.url("/api/v3/coins/"+id+"/market_chart", q)
	if err := fetchJSON(ctx, c.http, u, "coingecko market_chart", &resp); err != nil {
		return nil, err
	}
	pts := make([]PontoDePreco, 0, len(resp.Prices))
	for _, p := range resp.Prices {
		if len(p) != 2 {
			continue
		}
		ms, err := strconv.ParseInt(p[0].String(), 10, 64)
		if err != nil {
			return nil, fmt.Errorf("coingecko %s histórico: timestamp inválido %q", ticker, p[0].String())
		}
		observed := brtDate(time.UnixMilli(ms))
		if !noIntervalo(observed, de, ate) {
			continue
		}
		cents, err := centsFromDecimal(p[1].String())
		if err != nil {
			return nil, fmt.Errorf("coingecko %s histórico: %w", ticker, err)
		}
		pts = append(pts, PontoDePreco{ObservedOn: observed, PriceCents: cents, Source: "coingecko"})
	}
	return pts, nil
}

// resolveIDs traduz tickers→ids, ignorando os sem mapa, e devolve a volta id→ticker.
func (c *CoinGecko) resolveIDs(tickers []string) ([]string, map[string]string) {
	ids := make([]string, 0, len(tickers))
	idToTicker := make(map[string]string, len(tickers))
	for _, tk := range tickers {
		id, ok := c.idDe(tk)
		if !ok {
			continue
		}
		ids = append(ids, id)
		idToTicker[id] = tk
	}
	return ids, idToTicker
}

func (c *CoinGecko) url(path string, q url.Values) string {
	if c.apiKey != "" {
		q.Set("x_cg_demo_api_key", c.apiKey)
	}
	return c.baseURL + path + "?" + q.Encode()
}

// daysAte devolve quantos dias atrás está `de` (param `days` do market_chart, até hoje).
func daysAte(de time.Time) string {
	days := int(time.Since(de).Hours()/24) + 1
	if days < 1 {
		days = 1
	}
	return strconv.Itoa(days)
}

// IDPadrao mapeia os tickers de cripto mais comuns para ids do CoinGecko. Tickers
// fora da tabela não têm cotação automática (cadastre o preço à mão). Ampliar
// conforme a carteira cresce — ver docs/context/cotacao.md.
func IDPadrao(ticker string) (string, bool) {
	id, ok := idsCripto[strings.ToUpper(ticker)]
	return id, ok
}

var idsCripto = map[string]string{
	"BTC":   "bitcoin",
	"ETH":   "ethereum",
	"USDT":  "tether",
	"BNB":   "binancecoin",
	"SOL":   "solana",
	"XRP":   "ripple",
	"USDC":  "usd-coin",
	"ADA":   "cardano",
	"DOGE":  "dogecoin",
	"MATIC": "matic-network",
	"DOT":   "polkadot",
	"LTC":   "litecoin",
}
