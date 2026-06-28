package cotacao

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// Brapi é uma FonteDePreco para ativos da B3 (ações e FIIs) via brapi.dev, com
// preços já em BRL. Sem cotação ao vivo paga: usa o último preço regular e o
// histórico diário. Sempre o close NÃO-ajustado (bonificação/split já entram como
// trade de preço 0 no domínio — usar o ajustado contaria o ajuste duas vezes).
type Brapi struct {
	baseURL string
	token   string
	http    *http.Client
}

// NewBrapi cria o client. token vazio funciona só para os tickers de demonstração
// da brapi; em produção passe o BRAPI_TOKEN. hc nil usa um client com timeout.
//
//	b := cotacao.NewBrapi("https://brapi.dev", os.Getenv("BRAPI_TOKEN"), nil)
func NewBrapi(baseURL, token string, hc *http.Client) *Brapi {
	return &Brapi{baseURL: strings.TrimRight(baseURL, "/"), token: token, http: httpClient(hc)}
}

type brapiQuoteResp struct {
	Results []struct {
		Symbol             string      `json:"symbol"`
		RegularMarketPrice json.Number `json:"regularMarketPrice"`
		RegularMarketTime  string      `json:"regularMarketTime"`
	} `json:"results"`
}

// UltimosPrecos busca o último preço de vários tickers numa só chamada (a brapi
// aceita lista separada por vírgula — 1 request para a carteira toda).
func (b *Brapi) UltimosPrecos(ctx context.Context, tickers []string) (map[string]Cotacao, error) {
	out := make(map[string]Cotacao, len(tickers))
	if len(tickers) == 0 {
		return out, nil
	}
	var resp brapiQuoteResp
	u := b.url("/api/quote/"+strings.Join(tickers, ","), nil)
	if err := fetchJSON(ctx, b.http, u, "brapi quote", &resp); err != nil {
		return nil, err
	}
	for _, r := range resp.Results {
		cents, err := centsFromDecimal(r.RegularMarketPrice.String())
		if err != nil {
			return nil, fmt.Errorf("brapi %s: %w", r.Symbol, err)
		}
		out[r.Symbol] = Cotacao{PriceCents: cents, AsOf: parseBrapiTime(r.RegularMarketTime), Source: "brapi"}
	}
	return out, nil
}

type brapiHistResp struct {
	Results []struct {
		HistoricalDataPrice []struct {
			Date  int64       `json:"date"`  // unix seconds
			Close json.Number `json:"close"` // não-ajustado
		} `json:"historicalDataPrice"`
	} `json:"results"`
}

// Historico devolve os fechamentos diários de um ticker em [de, ate]. Pede à brapi
// o range coarse que cobre o intervalo e filtra a janela exata no cliente.
func (b *Brapi) Historico(ctx context.Context, ticker string, de, ate time.Time) ([]PontoDePreco, error) {
	var resp brapiHistResp
	q := url.Values{"range": {brapiRange(de)}, "interval": {"1d"}}
	u := b.url("/api/quote/"+ticker, q)
	if err := fetchJSON(ctx, b.http, u, "brapi history", &resp); err != nil {
		return nil, err
	}
	if len(resp.Results) == 0 {
		return nil, nil
	}
	pts := make([]PontoDePreco, 0, len(resp.Results[0].HistoricalDataPrice))
	for _, h := range resp.Results[0].HistoricalDataPrice {
		observed := brtDate(time.Unix(h.Date, 0))
		if !noIntervalo(observed, de, ate) {
			continue
		}
		cents, err := centsFromDecimal(h.Close.String())
		if err != nil {
			return nil, fmt.Errorf("brapi %s histórico: %w", ticker, err)
		}
		pts = append(pts, PontoDePreco{ObservedOn: observed, PriceCents: cents, Source: "brapi"})
	}
	return pts, nil
}

// url monta a URL com o token na query (não vaza em log: os erros usam um label).
func (b *Brapi) url(path string, q url.Values) string {
	if q == nil {
		q = url.Values{}
	}
	if b.token != "" {
		q.Set("token", b.token)
	}
	if enc := q.Encode(); enc != "" {
		return b.baseURL + path + "?" + enc
	}
	return b.baseURL + path
}

func parseBrapiTime(s string) time.Time {
	t, err := time.Parse(time.RFC3339, s)
	if err != nil {
		return time.Time{}
	}
	return t
}

// brapiRange escolhe o menor range enum da brapi (relativo a hoje) que cobre `de`.
func brapiRange(de time.Time) string {
	days := time.Since(de).Hours() / 24
	switch {
	case days <= 30:
		return "1mo"
	case days <= 90:
		return "3mo"
	case days <= 180:
		return "6mo"
	case days <= 366:
		return "1y"
	case days <= 366*2:
		return "2y"
	case days <= 366*5:
		return "5y"
	default:
		return "max"
	}
}
