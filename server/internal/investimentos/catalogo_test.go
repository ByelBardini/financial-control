package investimentos_test

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"financial-control/server/internal/cotacao"
	"financial-control/server/internal/investimentos"
)

// fakeBuscador é um Buscador nomeado: registra a última chamada e devolve itens/erro fixos.
type fakeBuscador struct {
	itens    []cotacao.AtivoBusca
	err      error
	chamado  bool
	gotClass string
	gotQuery string
	gotLimit int
}

func (f *fakeBuscador) Buscar(ctx context.Context, class, query string, limit int) ([]cotacao.AtivoBusca, error) {
	f.chamado = true
	f.gotClass, f.gotQuery, f.gotLimit = class, query, limit
	return f.itens, f.err
}

func TestCatalogoMapeiaItens(t *testing.T) {
	fake := &fakeBuscador{itens: []cotacao.AtivoBusca{{Ticker: "PETR4", Name: "Petrobras PN", PriceCents: 3806, LogoURL: "u"}}}
	svc := investimentos.NewService(&fakeInvestimentosStore{}, investimentos.ComBusca(fake))

	out, err := svc.Catalogo(context.Background(), "acoes", "PETR")
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if len(out) != 1 || out[0].Ticker != "PETR4" || out[0].PriceCents != 3806 || out[0].LogoUrl != "u" {
		t.Fatalf("out = %+v", out)
	}
	if fake.gotClass != "acoes" || fake.gotQuery != "PETR" || fake.gotLimit != 10 {
		t.Errorf("chamada = (%q,%q,%d), quero (acoes,PETR,10)", fake.gotClass, fake.gotQuery, fake.gotLimit)
	}
}

func TestCatalogoTrimNaQuery(t *testing.T) {
	fake := &fakeBuscador{}
	svc := investimentos.NewService(&fakeInvestimentosStore{}, investimentos.ComBusca(fake))

	if _, err := svc.Catalogo(context.Background(), "acoes", "  PETR  "); err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if fake.gotQuery != "PETR" {
		t.Errorf("query = %q, quero PETR (sem espaços nas pontas)", fake.gotQuery)
	}
}

func TestCatalogoRendaFixaVazioSemChamarFonte(t *testing.T) {
	fake := &fakeBuscador{}
	svc := investimentos.NewService(&fakeInvestimentosStore{}, investimentos.ComBusca(fake))

	out, err := svc.Catalogo(context.Background(), "renda_fixa", "tesouro")
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if len(out) != 0 {
		t.Errorf("out = %+v, quero vazio (renda_fixa não tem catálogo)", out)
	}
	if fake.chamado {
		t.Error("renda_fixa não deveria chamar a fonte de busca")
	}
}

func TestCatalogoQueryCurtaVazioSemChamarFonte(t *testing.T) {
	fake := &fakeBuscador{}
	svc := investimentos.NewService(&fakeInvestimentosStore{}, investimentos.ComBusca(fake))

	out, err := svc.Catalogo(context.Background(), "acoes", "p")
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if len(out) != 0 || fake.chamado {
		t.Errorf("query curta deveria devolver [] sem chamar a fonte (out=%+v chamado=%v)", out, fake.chamado)
	}
}

func TestCatalogoSemBuscadorVazio(t *testing.T) {
	svc := investimentos.NewService(&fakeInvestimentosStore{}) // sem ComBusca → autocomplete desligado

	out, err := svc.Catalogo(context.Background(), "acoes", "PETR")
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if len(out) != 0 {
		t.Errorf("sem buscador deveria devolver [] (out=%+v)", out)
	}
}

func TestCatalogoClasseInvalidaErro(t *testing.T) {
	svc := investimentos.NewService(&fakeInvestimentosStore{}, investimentos.ComBusca(&fakeBuscador{}))

	if _, err := svc.Catalogo(context.Background(), "foo", "PETR"); !errors.Is(err, investimentos.ErrClasseInvalida) {
		t.Fatalf("err = %v, quero ErrClasseInvalida", err)
	}
}

func TestCatalogoHandlerJSON(t *testing.T) {
	fake := &fakeBuscador{itens: []cotacao.AtivoBusca{{Ticker: "PETR4", Name: "Petrobras PN", PriceCents: 3806, LogoURL: "https://logo"}}}
	svc := investimentos.NewService(&fakeInvestimentosStore{}, investimentos.ComBusca(fake))

	assertJSON(t, do(t, investimentos.CatalogoHandler(svc), "/investimentos/catalogo?class=acoes&q=PETR"),
		`[{"ticker":"PETR4","name":"Petrobras PN","priceCents":3806,"logoUrl":"https://logo"}]`)
}

func TestCatalogoHandlerVazioArray(t *testing.T) {
	svc := investimentos.NewService(&fakeInvestimentosStore{}, investimentos.ComBusca(&fakeBuscador{}))

	if got := do(t, investimentos.CatalogoHandler(svc), "/investimentos/catalogo?class=acoes&q=zzz").Body.String(); got != "[]\n" {
		t.Fatalf("body = %q, quero [] (sem resultados não pode virar null)", got)
	}
}

func TestCatalogoHandlerClasseInvalida400(t *testing.T) {
	svc := investimentos.NewService(&fakeInvestimentosStore{}, investimentos.ComBusca(&fakeBuscador{}))
	rec := do(t, investimentos.CatalogoHandler(svc), "/investimentos/catalogo?class=foo&q=PETR")
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, quero 400 (classe inválida)", rec.Code)
	}
}

func TestCatalogoHandlerSemUsuario401(t *testing.T) {
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/investimentos/catalogo?class=acoes&q=PETR", nil) // sem userID
	investimentos.CatalogoHandler(investimentos.NewService(&fakeInvestimentosStore{}, investimentos.ComBusca(&fakeBuscador{}))).ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, quero 401 (sem usuário no contexto)", rec.Code)
	}
}

func TestCatalogoHandlerErroProvedor500(t *testing.T) {
	fake := &fakeBuscador{err: errors.New("brapi fora do ar")}
	svc := investimentos.NewService(&fakeInvestimentosStore{}, investimentos.ComBusca(fake))
	rec := do(t, investimentos.CatalogoHandler(svc), "/investimentos/catalogo?class=acoes&q=PETR")
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, quero 500 (erro do provedor)", rec.Code)
	}
}
