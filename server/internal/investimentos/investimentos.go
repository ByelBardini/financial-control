// Package investimentos serve a carteira de investimentos: as views agregadas da tela
// (resumo, posições, alocação, cripto à parte) e o recurso de ativos/operações (CRUD +
// compra/venda). Mesmas camadas dos demais domínios: handler → service (agrega/deriva) →
// store (pgx/sqlc). Tudo escopado por user_id (do token). Dinheiro em centavos (int64);
// a posição (preço médio móvel, custo, valor, realizado) é DERIVADA das operações no store.
package investimentos

import (
	"context"
	"fmt"
	"math"
	"time"

	"financial-control/server/internal/cotacao"
	"financial-control/server/internal/pct"
	"financial-control/server/internal/store"
)

// DTOs com tags json 1:1 com client/src/types/investimentos.ts (+ realizedCents aditivo).

// Position é a posição de um ativo do portfólio geral (Ações/FIIs/Renda Fixa).
type Position struct {
	ID                string  `json:"id"`
	Ticker            string  `json:"ticker"`
	Name              string  `json:"name"`
	AssetClass        string  `json:"assetClass"`
	Icon              string  `json:"icon"`
	CostBasisCents    int64   `json:"costBasisCents"`
	CurrentValueCents int64   `json:"currentValueCents"`
	GainCents         int64   `json:"gainCents"`
	GainPct           float64 `json:"gainPct"`
	RealizedCents     int64   `json:"realizedCents"`
}

// PortfolioSummary é o resumo do portfólio geral (cripto fora).
type PortfolioSummary struct {
	TotalCents int64   `json:"totalCents"`
	GainCents  int64   `json:"gainCents"`
	GainPct    float64 `json:"gainPct"`
	Title      string  `json:"title"`
	Quip       string  `json:"quip"`
}

// AllocationSlice é uma fatia da alocação por classe (percent 0..100).
type AllocationSlice struct {
	AssetClass string `json:"assetClass"`
	Label      string `json:"label"`
	ValueCents int64  `json:"valueCents"`
	Percent    int    `json:"percent"`
	Tone       string `json:"tone"`
}

// CryptoHolding é uma posição de cripto (pilar à parte) + a série de preços do gráfico.
type CryptoHolding struct {
	ID                string              `json:"id"`
	Symbol            string              `json:"symbol"`
	Name              string              `json:"name"`
	Icon              string              `json:"icon"`
	CostBasisCents    int64               `json:"costBasisCents"`
	CurrentValueCents int64               `json:"currentValueCents"`
	GainCents         int64               `json:"gainCents"`
	GainPct           float64             `json:"gainPct"`
	Series            []PriceHistoryPoint `json:"series"`
}

// CryptoBlock é o bloco de cripto separado do portfólio geral (subtotal próprio).
type CryptoBlock struct {
	Title         string          `json:"title"`
	Subtitle      string          `json:"subtitle,omitempty"`
	SubtotalCents int64           `json:"subtotalCents"`
	GainCents     int64           `json:"gainCents"`
	GainPct       float64         `json:"gainPct"`
	Holdings      []CryptoHolding `json:"holdings"`
}

// PriceHistoryPoint é um ponto da série de preço de um ativo (data AAAA-MM-DD + preço em centavos).
type PriceHistoryPoint struct {
	Date       string `json:"date"`
	PriceCents int64  `json:"priceCents"`
}

// EvolutionPoint é um ponto da evolução do patrimônio geral: valor de mercado × custo acumulado
// (o gap entre eles = ganho não-realizado). Dinheiro em centavos; data AAAA-MM-DD.
type EvolutionPoint struct {
	Date             string `json:"date"`
	MarketValueCents int64  `json:"marketValueCents"`
	CostBasisCents   int64  `json:"costBasisCents"`
}

// InvestimentosStore é a dependência de dados do domínio (escopada por usuário). As views
// usam só as duas primeiras; o recurso CRUD (crud.go) usa o restante.
type InvestimentosStore interface {
	ListPositions(ctx context.Context, userID string, includeCrypto, onlyCrypto bool) ([]store.PositionRow, error)
	ListCryptoSeries(ctx context.Context, userID string) ([]store.CryptoSeriesRow, error)
	GetAssetPosition(ctx context.Context, userID, assetID string) (store.PositionRow, error)
	GetAssetByID(ctx context.Context, userID, assetID string) (store.AssetMetaRow, error)
	GetAssetNetQuantity(ctx context.Context, userID, assetID string) (string, error)
	ListTradesByAsset(ctx context.Context, userID, assetID string) ([]store.TradeRow, error)
	CreateAsset(ctx context.Context, userID string, in store.AssetInput) (string, error)
	UpdateAsset(ctx context.Context, userID, assetID string, in store.AssetInput) error
	ArchiveAsset(ctx context.Context, userID, assetID string) error
	AppendPriceObservation(ctx context.Context, userID, assetID string, priceCents int64, observedOn time.Time) (int64, error)
	UpsertDailyPrices(ctx context.Context, userID, assetID string, pts []store.PricePoint) (int64, error)
	ListPriceHistory(ctx context.Context, userID, assetID string, de, ate time.Time) ([]store.PricePoint, error)
	PortfolioEvolution(ctx context.Context, userID string, de, ate time.Time) ([]store.EvolutionRow, error)
	RecordTrade(ctx context.Context, userID, assetID, side, ticker string, in store.TradeInput) error
	DeleteTrade(ctx context.Context, userID, assetID, tradeID string) error
}

// Cotador busca o histórico inicial de preço de um ativo, para o backfill no cadastro.
// *cotacao.Resolver implementa (escolhe a fonte pela classe). nil desliga o backfill.
type Cotador interface {
	Historico(ctx context.Context, ticker, class string, de, ate time.Time) ([]cotacao.PontoDePreco, error)
}

// Service agrega as views da carteira e orquestra o recurso de ativos/operações. Sem estado além
// do store, do cotador (backfill de preço no cadastro) e do buscador (catálogo do autocomplete) —
// ambos opcionais.
type Service struct {
	store    InvestimentosStore
	cotador  Cotador  // nil = sem cotação automática (backfill desligado)
	buscador Buscador // nil = sem autocomplete de catálogo (Catalogo devolve [])
}

// Option configura o Service na construção.
type Option func(*Service)

// ComBackfill liga a cotação automática: ao criar um ativo, o histórico de preço é puxado do
// provedor em segundo plano (best-effort) e gravado no ledger. Sem ela, o cadastro não busca preço.
func ComBackfill(c Cotador) Option {
	return func(s *Service) { s.cotador = c }
}

// ComBusca liga o autocomplete do cadastro: o campo de ticker busca ativos reais no catálogo
// externo (brapi/CoinGecko). Sem ela, Catalogo devolve [] (busca desligada).
func ComBusca(b Buscador) Option {
	return func(s *Service) { s.buscador = b }
}

// NewService injeta a dependência de dados; Options ligam recursos opcionais (ex.: ComBackfill).
//
//	svc := investimentos.NewService(store, investimentos.ComBackfill(resolver))
func NewService(s InvestimentosStore, opts ...Option) *Service {
	svc := &Service{store: s}
	for _, o := range opts {
		o(svc)
	}
	return svc
}

// Summary resume o portfólio GERAL (Ações/FIIs/Renda Fixa — cripto fora): patrimônio atual,
// ganho/perda (valor − custo) e % + título/frase derivados do desempenho.
func (s *Service) Summary(ctx context.Context, userID string) (PortfolioSummary, error) {
	rows, err := s.store.ListPositions(ctx, userID, false, false)
	if err != nil {
		return PortfolioSummary{}, fmt.Errorf("investimentos: resumo: %w", err)
	}
	var total, cost int64
	for _, r := range rows {
		total += r.CurrentValueCents
		cost += r.CostBasisCents
	}
	gain := total - cost
	gainPct := gainPercent(gain, cost)
	return PortfolioSummary{
		TotalCents: total,
		GainCents:  gain,
		GainPct:    gainPct,
		Title:      summaryTitle,
		Quip:       summaryQuip(gainPct),
	}, nil
}

// Positions lista as posições ABERTAS do portfólio geral (omite as zeradas/totalmente vendidas).
func (s *Service) Positions(ctx context.Context, userID string) ([]Position, error) {
	rows, err := s.store.ListPositions(ctx, userID, false, false)
	if err != nil {
		return nil, fmt.Errorf("investimentos: posições: %w", err)
	}
	out := make([]Position, 0, len(rows))
	for _, r := range rows {
		if !isOpen(r) {
			continue
		}
		out = append(out, position(r))
	}
	return out, nil
}

// Allocation deriva a alocação por classe do portfólio geral (percent = share do total).
func (s *Service) Allocation(ctx context.Context, userID string) ([]AllocationSlice, error) {
	rows, err := s.store.ListPositions(ctx, userID, false, false)
	if err != nil {
		return nil, fmt.Errorf("investimentos: alocação: %w", err)
	}
	byClass := make(map[string]int64, len(allocationOrder))
	var total int64
	for _, r := range rows {
		byClass[r.AssetClass] += r.CurrentValueCents
		total += r.CurrentValueCents
	}
	out := make([]AllocationSlice, 0, len(allocationOrder))
	for _, class := range allocationOrder {
		value := byClass[class]
		if value <= 0 {
			continue
		}
		out = append(out, AllocationSlice{
			AssetClass: class,
			Label:      classLabel(class),
			ValueCents: value,
			Percent:    pct.Clamp(value, total),
			Tone:       classTone(class),
		})
	}
	return out, nil
}

// Crypto monta o bloco de cripto À PARTE (não entra no resumo/alocação geral): subtotal próprio,
// ganho/perda e cada holding com sua série de preços (do histórico).
func (s *Service) Crypto(ctx context.Context, userID string) (CryptoBlock, error) {
	rows, err := s.store.ListPositions(ctx, userID, true, true)
	if err != nil {
		return CryptoBlock{}, fmt.Errorf("investimentos: cripto: %w", err)
	}
	series, err := s.store.ListCryptoSeries(ctx, userID)
	if err != nil {
		return CryptoBlock{}, fmt.Errorf("investimentos: série da cripto: %w", err)
	}
	seriesByAsset := make(map[string][]PriceHistoryPoint)
	for _, sr := range series {
		seriesByAsset[sr.AssetID] = append(seriesByAsset[sr.AssetID], PriceHistoryPoint{
			Date:       sr.ObservedOn.Format(tradeDateLayout),
			PriceCents: sr.PriceCents,
		})
	}
	holdings := make([]CryptoHolding, 0, len(rows))
	var subtotal, cost int64
	for _, r := range rows {
		if !isOpen(r) {
			continue
		}
		gain := r.CurrentValueCents - r.CostBasisCents
		points := seriesByAsset[r.ID]
		if points == nil {
			points = []PriceHistoryPoint{}
		}
		holdings = append(holdings, CryptoHolding{
			ID:                r.ID,
			Symbol:            r.Ticker,
			Name:              r.Name,
			Icon:              r.Icon,
			CostBasisCents:    r.CostBasisCents,
			CurrentValueCents: r.CurrentValueCents,
			GainCents:         gain,
			GainPct:           gainPercent(gain, r.CostBasisCents),
			Series:            points,
		})
		subtotal += r.CurrentValueCents
		cost += r.CostBasisCents
	}
	blockGain := subtotal - cost
	return CryptoBlock{
		Title:         cryptoTitle,
		Subtitle:      cryptoSubtitle(len(holdings)),
		SubtotalCents: subtotal,
		GainCents:     blockGain,
		GainPct:       gainPercent(blockGain, cost),
		Holdings:      holdings,
	}, nil
}

// PriceHistory devolve a série diária de preço de um ativo no período pedido (range). Alimenta o
// gráfico de histórico por ativo.
func (s *Service) PriceHistory(ctx context.Context, userID, assetID, rangeParam string) ([]PriceHistoryPoint, error) {
	de, ate := rangeParaDatas(rangeParam)
	rows, err := s.store.ListPriceHistory(ctx, userID, assetID, de, ate)
	if err != nil {
		return nil, fmt.Errorf("investimentos: histórico de preço: %w", err)
	}
	out := make([]PriceHistoryPoint, 0, len(rows))
	for _, r := range rows {
		out = append(out, PriceHistoryPoint{Date: r.ObservedOn.Format(tradeDateLayout), PriceCents: r.PriceCents})
	}
	return out, nil
}

// Evolution devolve a evolução diária do patrimônio geral (exclui cripto) no período: valor de
// mercado × custo acumulado — o gráfico de "valorizou ou não?".
func (s *Service) Evolution(ctx context.Context, userID, rangeParam string) ([]EvolutionPoint, error) {
	de, ate := rangeParaDatas(rangeParam)
	rows, err := s.store.PortfolioEvolution(ctx, userID, de, ate)
	if err != nil {
		return nil, fmt.Errorf("investimentos: evolução do patrimônio: %w", err)
	}
	out := make([]EvolutionPoint, 0, len(rows))
	for _, r := range rows {
		out = append(out, EvolutionPoint{
			Date:             r.OnDate.Format(tradeDateLayout),
			MarketValueCents: r.MarketValueCents,
			CostBasisCents:   r.CostBasisCents,
		})
	}
	return out, nil
}

// rangeParaDatas traduz o range pedido (1mo/3mo/6mo/1y/max) em [de, ate], com ate = hoje em BRT.
// Default (vazio/desconhecido) = 6 meses.
func rangeParaDatas(r string) (time.Time, time.Time) {
	ate := cotacao.DataBRT(time.Now())
	dias := 180
	switch r {
	case "1mo":
		dias = 30
	case "3mo":
		dias = 90
	case "6mo":
		dias = 180
	case "1y":
		dias = 365
	case "max":
		dias = 3650
	}
	return ate.AddDate(0, 0, -dias), ate
}

// position mapeia a linha derivada do store no DTO de posição (gainCents = valor − custo).
func position(r store.PositionRow) Position {
	gain := r.CurrentValueCents - r.CostBasisCents
	return Position{
		ID:                r.ID,
		Ticker:            r.Ticker,
		Name:              r.Name,
		AssetClass:        r.AssetClass,
		Icon:              r.Icon,
		CostBasisCents:    r.CostBasisCents,
		CurrentValueCents: r.CurrentValueCents,
		GainCents:         gain,
		GainPct:           gainPercent(gain, r.CostBasisCents),
		RealizedCents:     r.RealizedCents,
	}
}

// isOpen diz se a posição ainda tem quantidade (não foi totalmente vendida).
func isOpen(r store.PositionRow) bool {
	return r.NetQuantity != zeroQuantity
}

// gainPercent é o ganho/perda em % (2 casas), com guarda contra custo zero. Só display.
func gainPercent(gainCents, costBasisCents int64) float64 {
	if costBasisCents == 0 {
		return 0
	}
	return math.Round(float64(gainCents)/float64(costBasisCents)*10000) / 100
}
