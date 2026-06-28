package investimentos

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"financial-control/server/internal/cotacao"
)

const (
	// catalogoLimit é o teto de sugestões por busca (protege a cota das APIs grátis).
	catalogoLimit = 10
	// catalogoMinLen é o mínimo de caracteres (após trim) pra disparar a busca externa.
	catalogoMinLen = 2
)

// ErrClasseInvalida sinaliza uma classe de ativo fora do conjunto válido na busca de catálogo (o
// handler responde 400). Estados normais (renda_fixa, query curta, sem buscador) NÃO são erro —
// devolvem [].
var ErrClasseInvalida = errors.New("classe de ativo inválida")

// CatalogoItem é um candidato de ativo no autocomplete do cadastro. PriceCents = 0 quando a fonte
// não traz preço (cripto); LogoUrl pode vir vazio. Tags json 1:1 com client/src/types/investimentos.ts.
type CatalogoItem struct {
	Ticker     string `json:"ticker"`
	Name       string `json:"name"`
	PriceCents int64  `json:"priceCents"`
	LogoUrl    string `json:"logoUrl,omitempty"`
}

// Buscador busca candidatos de ativo por classe no catálogo externo (ações/FIIs via brapi, cripto
// via CoinGecko). *cotacao.Resolver implementa. nil desliga o autocomplete (Catalogo devolve []).
type Buscador interface {
	Buscar(ctx context.Context, class, query string, limit int) ([]cotacao.AtivoBusca, error)
}

// Catalogo busca ativos reais pro autocomplete do cadastro. Devolve [] (sem erro) nos estados
// normais do teclado: sem buscador, classe sem catálogo (renda_fixa) ou query curta demais. Classe
// fora do conjunto válido → ErrClasseInvalida (handler → 400). O limite é fixo (cota das APIs grátis).
//
//	itens, err := svc.Catalogo(ctx, "acoes", "PETR")
func (s *Service) Catalogo(ctx context.Context, class, query string) ([]CatalogoItem, error) {
	if !validAssetClasses[class] {
		return nil, fmt.Errorf("catálogo: %w (%q): use acoes|fiis|renda_fixa|cripto", ErrClasseInvalida, class)
	}
	q := strings.TrimSpace(query)
	if s.buscador == nil || !catalogoBuscavel(class) || len([]rune(q)) < catalogoMinLen {
		return []CatalogoItem{}, nil
	}
	achados, err := s.buscador.Buscar(ctx, class, q, catalogoLimit)
	if err != nil {
		return nil, fmt.Errorf("investimentos: buscar catálogo (%s): %w", class, err)
	}
	out := make([]CatalogoItem, 0, len(achados))
	for _, a := range achados {
		out = append(out, CatalogoItem{Ticker: a.Ticker, Name: a.Name, PriceCents: a.PriceCents, LogoUrl: a.LogoURL})
	}
	return out, nil
}

// catalogoBuscavel diz se a classe tem catálogo externo (renda_fixa não tem cotação nem busca).
func catalogoBuscavel(class string) bool {
	return class == "acoes" || class == "fiis" || class == "cripto"
}
