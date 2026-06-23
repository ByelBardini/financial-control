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
	ID                string  `json:"id"`
	Symbol            string  `json:"symbol"`
	Name              string  `json:"name"`
	Icon              string  `json:"icon"`
	CostBasisCents    int64   `json:"costBasisCents"`
	CurrentValueCents int64   `json:"currentValueCents"`
	GainCents         int64   `json:"gainCents"`
	GainPct           float64 `json:"gainPct"`
	Series            []int64 `json:"series"`
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
	RecordTrade(ctx context.Context, userID, assetID, side, ticker string, in store.TradeInput) error
	DeleteTrade(ctx context.Context, userID, assetID, tradeID string) error
}

// Service agrega as views da carteira e orquestra o recurso de ativos/operações. Sem estado
// além do store.
type Service struct {
	store InvestimentosStore
}

// NewService injeta a dependência de dados.
func NewService(s InvestimentosStore) *Service {
	return &Service{store: s}
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
	seriesByAsset := make(map[string][]int64)
	for _, sr := range series {
		seriesByAsset[sr.AssetID] = append(seriesByAsset[sr.AssetID], sr.PriceCents)
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
			points = []int64{}
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
