// Package cotacao busca preços de mercado de ativos e os normaliza em centavos BRL.
// Embrulha provedores externos (brapi para ações/FIIs, CoinGecko para cripto) atrás
// de uma interface própria, isolando o resto do app de mudanças de contrato deles.
// Renda fixa não tem cotação automática (ver docs/context/cotacao.md).
package cotacao

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// BRT é o fuso de Brasília (UTC-3). O Brasil não tem horário de verão desde 2019, então o offset
// é fixo — evita depender da base de tzdata do SO (Windows). Usado nas datas de pregão e no
// agendamento do job de cotação.
var BRT = time.FixedZone("BRT", -3*60*60)

// maxAttempts é o total de tentativas (1 original + retries) numa chamada HTTP.
const maxAttempts = 2

// Cotacao é o último preço conhecido de um ativo, em centavos BRL.
type Cotacao struct {
	PriceCents int64
	AsOf       time.Time // instante da cotação informado pelo provedor
	Source     string    // "brapi" | "coingecko"
}

// PontoDePreco é o fechamento de um ativo num dia (data em BRT), em centavos BRL.
type PontoDePreco struct {
	ObservedOn time.Time // meia-noite BRT do dia de pregão
	PriceCents int64
	Source     string
}

// FonteDePreco busca preços de uma classe de ativos. Cada implementação já sabe
// tratar os tickers da sua classe; o Resolver escolhe a fonte pela classe.
type FonteDePreco interface {
	// UltimosPrecos devolve o último preço de cada ticker (chave do mapa = ticker
	// de entrada). Tickers desconhecidos saem do mapa, sem erro.
	UltimosPrecos(ctx context.Context, tickers []string) (map[string]Cotacao, error)
	// Historico devolve a série diária (fechamentos) de um ticker no intervalo
	// [de, ate] inclusivo, em ordem cronológica.
	Historico(ctx context.Context, ticker string, de, ate time.Time) ([]PontoDePreco, error)
}

// Resolver escolhe a FonteDePreco pela classe do ativo (asset_class).
type Resolver struct {
	acoes  FonteDePreco // ações e FIIs (B3) → brapi
	cripto FonteDePreco // cripto → CoinGecko
}

// NewResolver liga as fontes às classes.
//
//	r := cotacao.NewResolver(brapi, coingecko)
//	fonte, ok := r.Para("acoes")
func NewResolver(acoes, cripto FonteDePreco) *Resolver {
	return &Resolver{acoes: acoes, cripto: cripto}
}

// Para devolve a fonte da classe, ou (nil, false) quando a classe não tem cotação
// automática (renda_fixa fica de fora — valorização dela é por índice, não preço).
func (r *Resolver) Para(class string) (FonteDePreco, bool) {
	switch class {
	case "acoes", "fiis":
		return r.acoes, r.acoes != nil
	case "cripto":
		return r.cripto, r.cripto != nil
	default:
		return nil, false
	}
}

// Historico resolve a fonte pela classe e devolve o histórico do ticker em [de, ate]. Classe
// sem cotação automática (ex.: renda_fixa) → (nil, nil), sem erro.
func (r *Resolver) Historico(ctx context.Context, ticker, class string, de, ate time.Time) ([]PontoDePreco, error) {
	fonte, ok := r.Para(class)
	if !ok {
		return nil, nil
	}
	return fonte.Historico(ctx, ticker, de, ate)
}

// UltimosPrecos resolve a fonte pela classe e busca o último preço dos tickers (em lote). Classe
// sem cotação automática → mapa vazio, sem erro.
func (r *Resolver) UltimosPrecos(ctx context.Context, class string, tickers []string) (map[string]Cotacao, error) {
	fonte, ok := r.Para(class)
	if !ok {
		return map[string]Cotacao{}, nil
	}
	return fonte.UltimosPrecos(ctx, tickers)
}

// brtDate normaliza um instante para a meia-noite do seu dia em Brasília.
func brtDate(t time.Time) time.Time {
	y, m, d := t.In(BRT).Date()
	return time.Date(y, m, d, 0, 0, 0, 0, BRT)
}

// DataBRT devolve a meia-noite (em Brasília) do dia de t — a data de pregão usada como observed_on.
// Exposto para quem grava preço fora do provider (ex.: PATCH manual) usar a mesma regra de fuso.
func DataBRT(t time.Time) time.Time {
	return brtDate(t)
}

// noIntervalo diz se a data (já em BRT) está em [de, ate] comparando só o dia.
func noIntervalo(data, de, ate time.Time) bool {
	dd := brtDate(data)
	return !dd.Before(brtDate(de)) && !dd.After(brtDate(ate))
}

// centsFromDecimal converte um número decimal (string, ex.: "38.5") para centavos,
// com aritmética exata (big.Rat, sem float) e arredondamento meio-pra-cima. Rejeita
// negativos — preço não pode ser < 0.
func centsFromDecimal(s string) (int64, error) {
	r, ok := new(big.Rat).SetString(strings.TrimSpace(s))
	if !ok {
		return 0, fmt.Errorf("preço inválido %q: esperado número decimal", s)
	}
	if r.Sign() < 0 {
		return 0, fmt.Errorf("preço negativo %q: esperado >= 0", s)
	}
	cents := new(big.Rat).Mul(r, big.NewRat(100, 1))
	cents.Add(cents, big.NewRat(1, 2)) // meio-pra-cima (valores não-negativos)
	return new(big.Int).Quo(cents.Num(), cents.Denom()).Int64(), nil
}

// httpClient devolve o client recebido ou um default com timeout (nunca sem timeout).
func httpClient(hc *http.Client) *http.Client {
	if hc != nil {
		return hc
	}
	return &http.Client{Timeout: 10 * time.Second}
}

// fetchJSON faz GET em url e decodifica o JSON em out. Retenta uma vez em 429/5xx
// honrando o cabeçalho Retry-After. `label` aparece nos erros no lugar da url (a url
// carrega o token — não vaza em log).
func fetchJSON(ctx context.Context, hc *http.Client, url, label string, out any) error {
	var lastErr error
	for attempt := 1; attempt <= maxAttempts; attempt++ {
		retry, err := tryFetchJSON(ctx, hc, url, label, out)
		if err == nil {
			return nil
		}
		lastErr = err
		if !retry || attempt == maxAttempts {
			return lastErr
		}
		select {
		case <-time.After(retryAfter(err)):
		case <-ctx.Done():
			return ctx.Err()
		}
	}
	return lastErr
}

// retryErr carrega o tempo de espera sugerido pelo provedor (Retry-After).
type retryErr struct {
	wait time.Duration
	err  error
}

func (e retryErr) Error() string { return e.err.Error() }

func retryAfter(err error) time.Duration {
	if re, ok := err.(retryErr); ok {
		return re.wait
	}
	return 250 * time.Millisecond
}

// tryFetchJSON faz uma tentativa; o bool diz se vale retentar (429/5xx/transporte).
func tryFetchJSON(ctx context.Context, hc *http.Client, url, label string, out any) (bool, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return false, fmt.Errorf("cotacao: montar request %s: %w", label, err)
	}
	req.Header.Set("Accept", "application/json")
	resp, err := hc.Do(req)
	if err != nil {
		return true, fmt.Errorf("cotacao: GET %s: %w", label, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode >= 500 {
		wait := parseRetryAfter(resp.Header.Get("Retry-After"))
		return true, retryErr{wait: wait, err: fmt.Errorf("cotacao: %s: status %d", label, resp.StatusCode)}
	}
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 256))
		return false, fmt.Errorf("cotacao: %s: status %d: %s", label, resp.StatusCode, strings.TrimSpace(string(body)))
	}
	if err := json.NewDecoder(resp.Body).Decode(out); err != nil {
		return false, fmt.Errorf("cotacao: decodificar %s: %w", label, err)
	}
	return false, nil
}

// parseRetryAfter lê o Retry-After em segundos; ausente/ inválido → backoff base.
func parseRetryAfter(h string) time.Duration {
	if secs, err := strconv.Atoi(strings.TrimSpace(h)); err == nil && secs >= 0 {
		return time.Duration(secs) * time.Second
	}
	return 250 * time.Millisecond
}
