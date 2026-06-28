package cotacao_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"

	"financial-control/server/internal/cotacao"
)

func TestBrapiBuscarAtivosMapeiaCampos(t *testing.T) {
	srv := fixtureServer(t)
	b := cotacao.NewBrapi(srv.URL, "tok", srv.Client())

	itens, err := b.BuscarAtivos(context.Background(), "PETR", "stock", 10)
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if len(itens) != 2 {
		t.Fatalf("len = %d, quero 2", len(itens))
	}
	if itens[0].Ticker != "PETR4" {
		t.Errorf("ticker = %q, quero PETR4", itens[0].Ticker)
	}
	if itens[0].Name == "" {
		t.Error("Name não deveria ser vazio")
	}
	if itens[0].PriceCents != 3806 {
		t.Errorf("PETR4 = %d centavos, quero 3806 (close 38.06)", itens[0].PriceCents)
	}
	if itens[0].LogoURL == "" {
		t.Error("LogoURL não deveria ser vazio")
	}
}

func TestBrapiBuscarAtivosCloseAusenteViraZero(t *testing.T) {
	srv := fixtureServer(t)
	b := cotacao.NewBrapi(srv.URL, "tok", srv.Client())

	itens, err := b.BuscarAtivos(context.Background(), "PETR", "stock", 10)
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	// O segundo item tem "close": null no fixture → preço 0, sem erro.
	if itens[1].PriceCents != 0 {
		t.Errorf("close null → %d centavos, quero 0", itens[1].PriceCents)
	}
}

func TestCoinGeckoBuscarAtivosSemPrecoESimboloMaiusculo(t *testing.T) {
	srv := fixtureServer(t)
	c := cotacao.NewCoinGecko(srv.URL, "", srv.Client(), btcID)

	itens, err := c.BuscarAtivos(context.Background(), "bit", 10)
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if len(itens) != 2 {
		t.Fatalf("len = %d, quero 2", len(itens))
	}
	if itens[0].Ticker != "BTC" {
		t.Errorf("ticker = %q, quero BTC", itens[0].Ticker)
	}
	if itens[1].Ticker != "ETH" {
		t.Errorf("ticker = %q, quero ETH (símbolo em maiúsculo)", itens[1].Ticker)
	}
	if itens[0].PriceCents != 0 {
		t.Errorf("cripto na busca não traz preço: %d, quero 0", itens[0].PriceCents)
	}
}

func TestCoinGeckoBuscarAtivosRespeitaLimite(t *testing.T) {
	srv := fixtureServer(t)
	c := cotacao.NewCoinGecko(srv.URL, "", srv.Client(), btcID)

	itens, err := c.BuscarAtivos(context.Background(), "bit", 1)
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if len(itens) != 1 {
		t.Fatalf("len = %d, quero 1 (limite aplicado no cliente)", len(itens))
	}
}

// TestBuscaEnviaPathEParametros prova que a busca bate no endpoint certo com os params certos — o
// fixture compartilhado devolve o mesmo arquivo pra qualquer type, então só um server que GRAVA a
// requisição pega um bug no brapiKind (fiis→fund) ou nos params (search/limit/query).
func TestBuscaEnviaPathEParametros(t *testing.T) {
	var gotPath string
	var gotQuery url.Values
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath, gotQuery = r.URL.Path, r.URL.Query()
		w.Header().Set("Content-Type", "application/json")
		if r.URL.Path == "/api/v3/search" {
			_, _ = w.Write([]byte(`{"coins":[]}`))
			return
		}
		_, _ = w.Write([]byte(`{"stocks":[]}`))
	}))
	t.Cleanup(srv.Close)

	b := cotacao.NewBrapi(srv.URL, "tok", srv.Client())
	cg := cotacao.NewCoinGecko(srv.URL, "", srv.Client(), btcID)
	r := cotacao.NewResolver(b, cg)

	if _, err := b.BuscarAtivos(context.Background(), "PETR", "stock", 7); err != nil {
		t.Fatalf("brapi busca: %v", err)
	}
	if gotPath != "/api/quote/list" {
		t.Errorf("path = %q, quero /api/quote/list", gotPath)
	}
	if gotQuery.Get("search") != "PETR" || gotQuery.Get("type") != "stock" || gotQuery.Get("limit") != "7" {
		t.Errorf("query = %v, quero search=PETR type=stock limit=7", gotQuery)
	}

	if _, err := r.Buscar(context.Background(), "fiis", "MXRF", 10); err != nil {
		t.Fatalf("resolver fiis: %v", err)
	}
	if gotQuery.Get("type") != "fund" {
		t.Errorf("fiis type = %q, quero fund (brapiKind)", gotQuery.Get("type"))
	}

	if _, err := r.Buscar(context.Background(), "cripto", "btc", 10); err != nil {
		t.Fatalf("resolver cripto: %v", err)
	}
	if gotPath != "/api/v3/search" || gotQuery.Get("query") != "btc" {
		t.Errorf("cripto path/query = %q / %q, quero /api/v3/search + query=btc", gotPath, gotQuery.Get("query"))
	}
}

// fonteSemBusca implementa FonteDePreco (só preço) mas NÃO BuscarAtivos — prova que o Resolver
// degrada pra vazio quando a fonte da classe não sabe buscar (type-assert falha).
type fonteSemBusca struct{}

func (fonteSemBusca) UltimosPrecos(context.Context, []string) (map[string]cotacao.Cotacao, error) {
	return nil, nil
}
func (fonteSemBusca) Historico(context.Context, string, time.Time, time.Time) ([]cotacao.PontoDePreco, error) {
	return nil, nil
}

func TestResolverBuscarFonteSemBuscaDegradaParaVazio(t *testing.T) {
	r := cotacao.NewResolver(fonteSemBusca{}, fonteSemBusca{})
	for _, class := range []string{"acoes", "fiis", "cripto"} {
		itens, err := r.Buscar(context.Background(), class, "x", 10)
		if err != nil || itens != nil {
			t.Errorf("classe %q com fonte sem busca = (%v,%v), quero (nil,nil)", class, itens, err)
		}
	}
}

func TestResolverBuscarPorClasse(t *testing.T) {
	srv := fixtureServer(t)
	acoes := cotacao.NewBrapi(srv.URL, "tok", srv.Client())
	cripto := cotacao.NewCoinGecko(srv.URL, "", srv.Client(), btcID)
	r := cotacao.NewResolver(acoes, cripto)

	t.Run("acoes usa brapi", func(t *testing.T) {
		itens, err := r.Buscar(context.Background(), "acoes", "PETR", 10)
		if err != nil {
			t.Fatalf("erro inesperado: %v", err)
		}
		if len(itens) == 0 || itens[0].Ticker != "PETR4" {
			t.Errorf("acoes = %+v, quero primeiro PETR4", itens)
		}
	})
	t.Run("fiis usa brapi", func(t *testing.T) {
		itens, err := r.Buscar(context.Background(), "fiis", "PETR", 10)
		if err != nil || len(itens) == 0 {
			t.Fatalf("fiis: itens=%d err=%v", len(itens), err)
		}
	})
	t.Run("cripto usa coingecko", func(t *testing.T) {
		itens, err := r.Buscar(context.Background(), "cripto", "bit", 10)
		if err != nil {
			t.Fatalf("erro inesperado: %v", err)
		}
		if len(itens) == 0 || itens[0].Ticker != "BTC" {
			t.Errorf("cripto = %+v, quero primeiro BTC", itens)
		}
	})
	t.Run("renda_fixa sem catálogo", func(t *testing.T) {
		itens, err := r.Buscar(context.Background(), "renda_fixa", "qualquer", 10)
		if err != nil || itens != nil {
			t.Errorf("renda_fixa = (%v,%v), quero (nil,nil)", itens, err)
		}
	})
	t.Run("classe desconhecida sem catálogo", func(t *testing.T) {
		itens, err := r.Buscar(context.Background(), "qualquer", "x", 10)
		if err != nil || itens != nil {
			t.Errorf("desconhecida = (%v,%v), quero (nil,nil)", itens, err)
		}
	})
}
