package cotacao

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"strconv"
	"strings"
)

// AtivoBusca é um candidato do catálogo de busca de ativos: ticker + nome, com preço (centavos)
// e logo opcionais. PriceCents = 0 quando a fonte não traz preço na busca (CoinGecko); LogoURL
// pode vir vazio. Alimenta o autocomplete do cadastro (ver docs/context/cotacao.md).
type AtivoBusca struct {
	Ticker     string
	Name       string
	PriceCents int64
	LogoURL    string
}

type brapiListResp struct {
	Stocks []struct {
		Stock string      `json:"stock"`
		Name  string      `json:"name"`
		Close json.Number `json:"close"`
		Logo  string      `json:"logo"`
	} `json:"stocks"`
}

// BuscarAtivos busca ativos da B3 cujo TICKER casa com query (brapi /api/quote/list). kind filtra
// a classe na própria API: "stock" (ações) | "fund" (FIIs). Lista vazia → slice vazio, sem erro.
// O preço vem do close não-ajustado; ausente/null vira 0.
//
//	itens, err := b.BuscarAtivos(ctx, "PETR", "stock", 10)
func (b *Brapi) BuscarAtivos(ctx context.Context, query, kind string, limit int) ([]AtivoBusca, error) {
	q := url.Values{"search": {query}, "limit": {strconv.Itoa(limit)}}
	if kind != "" {
		q.Set("type", kind)
	}
	var resp brapiListResp
	if err := fetchJSON(ctx, b.http, b.url("/api/quote/list", q), "brapi list", &resp); err != nil {
		return nil, err
	}
	out := make([]AtivoBusca, 0, len(resp.Stocks))
	for _, s := range resp.Stocks {
		cents, err := precoOpcional(s.Close.String())
		if err != nil {
			return nil, fmt.Errorf("brapi %s busca: %w", s.Stock, err)
		}
		out = append(out, AtivoBusca{Ticker: s.Stock, Name: s.Name, PriceCents: cents, LogoURL: s.Logo})
	}
	return out, nil
}

type coingeckoSearchResp struct {
	Coins []struct {
		Symbol string `json:"symbol"`
		Name   string `json:"name"`
		Thumb  string `json:"thumb"`
	} `json:"coins"`
}

// BuscarAtivos busca cripto por nome OU símbolo (CoinGecko /api/v3/search), limitada a `limit`
// resultados (a API não pagina a busca, então o corte é no cliente). Sem preço na resposta da
// busca (PriceCents = 0); o símbolo vira ticker em maiúsculo.
//
//	itens, err := c.BuscarAtivos(ctx, "bitcoin", 10)
func (c *CoinGecko) BuscarAtivos(ctx context.Context, query string, limit int) ([]AtivoBusca, error) {
	q := url.Values{"query": {query}}
	var resp coingeckoSearchResp
	if err := fetchJSON(ctx, c.http, c.url("/api/v3/search", q), "coingecko search", &resp); err != nil {
		return nil, err
	}
	out := make([]AtivoBusca, 0, limit)
	for _, coin := range resp.Coins {
		if len(out) >= limit {
			break
		}
		out = append(out, AtivoBusca{Ticker: strings.ToUpper(coin.Symbol), Name: coin.Name, LogoURL: coin.Thumb})
	}
	return out, nil
}

// Buscar resolve a fonte pela classe e busca candidatos do catálogo: acoes/fiis → brapi (filtro
// type stock/fund), cripto → CoinGecko. Classe sem catálogo (renda_fixa/desconhecida) ou fonte
// que não busca → (nil, nil), sem erro — espelha Resolver.UltimosPrecos.
func (r *Resolver) Buscar(ctx context.Context, class, query string, limit int) ([]AtivoBusca, error) {
	switch class {
	case "acoes", "fiis":
		b, ok := r.acoes.(*Brapi)
		if !ok {
			return nil, nil
		}
		return b.BuscarAtivos(ctx, query, brapiKind(class), limit)
	case "cripto":
		c, ok := r.cripto.(*CoinGecko)
		if !ok {
			return nil, nil
		}
		return c.BuscarAtivos(ctx, query, limit)
	default:
		return nil, nil
	}
}

// brapiKind traduz a classe do app no filtro `type` da brapi (/api/quote/list).
func brapiKind(class string) string {
	if class == "fiis" {
		return "fund"
	}
	return "stock"
}

// precoOpcional converte um decimal opcional (string vazia/null → 0) em centavos. Usado no preço
// de busca da brapi (close), que pode vir ausente.
func precoOpcional(s string) (int64, error) {
	if strings.TrimSpace(s) == "" {
		return 0, nil
	}
	return centsFromDecimal(s)
}
