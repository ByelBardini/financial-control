package investimentos

import (
	"context"
	"errors"
	"fmt"
	"log"
	"regexp"
	"strings"
	"time"

	"financial-control/server/internal/cotacao"
	"financial-control/server/internal/store"
)

// AssetPosition é um ativo com a posição derivada (metadados + quantidade/preço médio/valor/
// realizado). É o item da lista de ativos e a base do detalhe.
type AssetPosition struct {
	ID                string  `json:"id"`
	Ticker            string  `json:"ticker"`
	Name              string  `json:"name"`
	AssetClass        string  `json:"assetClass"`
	Icon              string  `json:"icon"`
	CurrentPriceCents int64   `json:"currentPriceCents"`
	NetQuantity       string  `json:"netQuantity"`
	AvgPriceCents     int64   `json:"avgPriceCents"`
	CostBasisCents    int64   `json:"costBasisCents"`
	CurrentValueCents int64   `json:"currentValueCents"`
	GainCents         int64   `json:"gainCents"`
	GainPct           float64 `json:"gainPct"`
	RealizedCents     int64   `json:"realizedCents"`
}

// Trade é uma operação (compra/venda) na resposta do detalhe. Quantidade como string decimal;
// accountId = conta de liquidação (vazio nos trades legados sem caixa).
type Trade struct {
	ID             string `json:"id"`
	Side           string `json:"side"`
	Quantity       string `json:"quantity"`
	UnitPriceCents int64  `json:"unitPriceCents"`
	TradedOn       string `json:"tradedOn"`
	AccountId      string `json:"accountId"`
}

// AssetDetail é o ativo completo: posição derivada + histórico de operações.
type AssetDetail struct {
	AssetPosition
	Trades []Trade `json:"trades"`
}

// CreateAssetInput é o corpo de criação de ativo (preço atual inicial em centavos).
type CreateAssetInput struct {
	Ticker            string `json:"ticker"`
	Name              string `json:"name"`
	AssetClass        string `json:"assetClass"`
	Icon              string `json:"icon"`
	CurrentPriceCents int64  `json:"currentPriceCents"`
}

// UpdateAssetInput é o corpo de edição. NÃO tem assetClass: a classe é imutável (criar outro
// ativo se precisar). Mudar currentPriceCents grava um ponto no histórico de preço.
type UpdateAssetInput struct {
	Ticker            string `json:"ticker"`
	Name              string `json:"name"`
	Icon              string `json:"icon"`
	CurrentPriceCents int64  `json:"currentPriceCents"`
}

// CreateTradeInput é o corpo de uma operação. Quantity é string decimal (até 8 casas, positiva);
// dinheiro em centavos; data AAAA-MM-DD; accountId = conta que liquida (debita na compra / credita
// na venda).
type CreateTradeInput struct {
	Side           string `json:"side"`
	Quantity       string `json:"quantity"`
	UnitPriceCents int64  `json:"unitPriceCents"`
	TradedOn       string `json:"tradedOn"`
	AccountId      string `json:"accountId"`
}

var (
	validAssetClasses = map[string]bool{"acoes": true, "fiis": true, "renda_fixa": true, "cripto": true}
	// quantidade: decimal positivo com até 8 casas (rejeita float científico, vírgula e negativo).
	quantityRe = regexp.MustCompile(`^\d+(\.\d{1,8})?$`)
)

const tradeDateLayout = "2006-01-02"

// isPositiveDecimal aceita só o formato de quantityRe E com pelo menos um dígito não-zero
// (rejeita "0", "0.00000000"). Sem parsing decimal no Go — só checagem de string.
func isPositiveDecimal(s string) bool {
	if !quantityRe.MatchString(s) {
		return false
	}
	for _, c := range s {
		if c >= '1' && c <= '9' {
			return true
		}
	}
	return false
}

func (in CreateAssetInput) validate() error {
	if strings.TrimSpace(in.Ticker) == "" {
		return errors.New("ticker vazio: informe um ticker não-vazio")
	}
	if strings.TrimSpace(in.Name) == "" {
		return errors.New("name vazio: informe um nome não-vazio")
	}
	if !validAssetClasses[in.AssetClass] {
		return fmt.Errorf("assetClass inválido (%q): use acoes|fiis|renda_fixa|cripto", in.AssetClass)
	}
	if strings.TrimSpace(in.Icon) == "" {
		return errors.New("icon vazio: informe o nome do ícone")
	}
	if in.CurrentPriceCents < 0 {
		return fmt.Errorf("currentPriceCents inválido (%d): não pode ser negativo", in.CurrentPriceCents)
	}
	return nil
}

func (in UpdateAssetInput) validate() error {
	if strings.TrimSpace(in.Ticker) == "" {
		return errors.New("ticker vazio: informe um ticker não-vazio")
	}
	if strings.TrimSpace(in.Name) == "" {
		return errors.New("name vazio: informe um nome não-vazio")
	}
	if strings.TrimSpace(in.Icon) == "" {
		return errors.New("icon vazio: informe o nome do ícone")
	}
	if in.CurrentPriceCents < 0 {
		return fmt.Errorf("currentPriceCents inválido (%d): não pode ser negativo", in.CurrentPriceCents)
	}
	return nil
}

func (in CreateTradeInput) validate() error {
	if in.Side != "buy" && in.Side != "sell" {
		return fmt.Errorf("side inválido (%q): use buy|sell", in.Side)
	}
	if !isPositiveDecimal(in.Quantity) {
		return fmt.Errorf("quantity inválida (%q): use um decimal positivo com até 8 casas (ex.: 1.5)", in.Quantity)
	}
	if in.UnitPriceCents < 0 {
		return fmt.Errorf("unitPriceCents inválido (%d): não pode ser negativo", in.UnitPriceCents)
	}
	if _, err := time.Parse(tradeDateLayout, in.TradedOn); err != nil {
		return fmt.Errorf("tradedOn inválido (%q): use AAAA-MM-DD", in.TradedOn)
	}
	if strings.TrimSpace(in.AccountId) == "" {
		return errors.New("accountId vazio: escolha a conta de liquidação")
	}
	return nil
}

func (in CreateAssetInput) toStore() store.AssetInput {
	return store.AssetInput{
		Ticker:            in.Ticker,
		Name:              in.Name,
		AssetClass:        in.AssetClass,
		Icon:              in.Icon,
		CurrentPriceCents: in.CurrentPriceCents,
	}
}

// toStore preenche AssetClass com a classe atual (a query de update a ignora — é imutável).
func (in UpdateAssetInput) toStore(currentClass string) store.AssetInput {
	return store.AssetInput{
		Ticker:            in.Ticker,
		Name:              in.Name,
		AssetClass:        currentClass,
		Icon:              in.Icon,
		CurrentPriceCents: in.CurrentPriceCents,
	}
}

// Assets lista TODOS os ativos do usuário (incl. cripto e posições zeradas) com a posição
// derivada — pra tela de gestão / futura UI de compra-venda.
func (s *Service) Assets(ctx context.Context, userID string) ([]AssetPosition, error) {
	rows, err := s.store.ListPositions(ctx, userID, true, false)
	if err != nil {
		return nil, fmt.Errorf("investimentos: listar ativos: %w", err)
	}
	out := make([]AssetPosition, 0, len(rows))
	for _, r := range rows {
		out = append(out, assetPosition(r))
	}
	return out, nil
}

// GetAsset devolve o ativo completo (posição + operações). store.ErrAssetNotFound → 404.
func (s *Service) GetAsset(ctx context.Context, userID, id string) (AssetDetail, error) {
	return s.assetDetail(ctx, userID, id)
}

// CreateAsset cria o ativo e devolve o recurso (posição derivada, ainda sem operações). Se houver
// cotador, dispara o backfill do histórico de preço em segundo plano — best-effort, NÃO bloqueia o
// cadastro num request externo (o gráfico aparece alguns segundos depois).
func (s *Service) CreateAsset(ctx context.Context, userID string, in CreateAssetInput) (AssetDetail, error) {
	id, err := s.store.CreateAsset(ctx, userID, in.toStore())
	if err != nil {
		return AssetDetail{}, fmt.Errorf("investimentos: criar ativo: %w", err)
	}
	if s.cotador != nil {
		go s.backfillPreco(userID, id, in.Ticker, in.AssetClass)
	}
	return s.assetDetail(ctx, userID, id)
}

// BackfillExistentes dispara o backfill de histórico dos ativos JÁ cadastrados do usuário (classes
// cotáveis — renda_fixa fica de fora), em segundo plano e SEQUENCIAL (gentil com o rate limit das
// APIs grátis). Best-effort: erros viram log. Devolve quantos ativos entraram na fila. Sem cotador
// (cotação automática desligada), não faz nada e devolve 0. Idempotente (o gravar é upsert).
func (s *Service) BackfillExistentes(ctx context.Context, userID string) (int, error) {
	if s.cotador == nil {
		return 0, nil
	}
	rows, err := s.store.ListPositions(ctx, userID, true, false)
	if err != nil {
		return 0, fmt.Errorf("investimentos: listar ativos p/ backfill: %w", err)
	}
	type alvo struct{ id, ticker, class string }
	alvos := make([]alvo, 0, len(rows))
	for _, r := range rows {
		if r.AssetClass == "renda_fixa" {
			continue
		}
		alvos = append(alvos, alvo{id: r.ID, ticker: r.Ticker, class: r.AssetClass})
	}
	go func() {
		for _, a := range alvos {
			s.backfillPreco(userID, a.id, a.ticker, a.class)
		}
	}()
	return len(alvos), nil
}

// backfillPreco puxa ~1 ano de histórico do provedor e grava no ledger. Roda em goroutine própria,
// com contexto/timeout próprios (o request já respondeu) — best-effort: erro vira só log.
func (s *Service) backfillPreco(userID, assetID, ticker, class string) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	ate := time.Now()
	pts, err := s.cotador.Historico(ctx, ticker, class, ate.AddDate(-1, 0, 0), ate)
	if err != nil {
		log.Printf("investimentos: backfill de preço de %s falhou: %v", ticker, err)
		return
	}
	if len(pts) == 0 {
		return
	}
	out := make([]store.PricePoint, 0, len(pts))
	for _, p := range pts {
		out = append(out, store.PricePoint{ObservedOn: p.ObservedOn, PriceCents: p.PriceCents, Source: p.Source})
	}
	if _, err := s.store.UpsertDailyPrices(ctx, userID, assetID, out); err != nil {
		log.Printf("investimentos: gravar backfill de %s falhou: %v", ticker, err)
	}
}

// UpdateAsset edita metadados + preço atual (classe imutável). Se o preço mudou, grava um ponto
// no histórico (alimenta o gráfico). store.ErrAssetNotFound → 404.
func (s *Service) UpdateAsset(ctx context.Context, userID, id string, in UpdateAssetInput) (AssetDetail, error) {
	current, err := s.store.GetAssetByID(ctx, userID, id)
	if err != nil {
		return AssetDetail{}, fmt.Errorf("investimentos: carregar ativo p/ editar: %w", err)
	}
	if err := s.store.UpdateAsset(ctx, userID, id, in.toStore(current.AssetClass)); err != nil {
		return AssetDetail{}, fmt.Errorf("investimentos: editar ativo: %w", err)
	}
	if in.CurrentPriceCents != current.CurrentPriceCents {
		// best-effort: o ponto de histórico é secundário; falhar aqui não invalida a edição já aplicada.
		// observed_on = dia de pregão em Brasília (não UTC) — mesma regra de fuso do provider (cotacao).
		_, _ = s.store.AppendPriceObservation(ctx, userID, id, in.CurrentPriceCents, cotacao.DataBRT(time.Now()))
	}
	return s.assetDetail(ctx, userID, id)
}

// ArchiveAsset faz soft-delete do ativo. store.ErrAssetNotFound → 404.
func (s *Service) ArchiveAsset(ctx context.Context, userID, id string) error {
	if err := s.store.ArchiveAsset(ctx, userID, id); err != nil {
		return fmt.Errorf("investimentos: arquivar ativo: %w", err)
	}
	return nil
}

// Trade registra uma compra ou venda (liquidada na conta escolhida) e devolve o ativo atualizado.
// Carrega o ativo antes pra distinguir 404 (não é do usuário) do resto e pra obter o ticker (vai na
// descrição da transação de caixa). Os sentinelas do store (insuficiente / conta inválida) sobem
// com %w pro handler mapear (400).
func (s *Service) Trade(ctx context.Context, userID, assetID string, in CreateTradeInput) (AssetDetail, error) {
	asset, err := s.store.GetAssetByID(ctx, userID, assetID)
	if err != nil {
		return AssetDetail{}, fmt.Errorf("investimentos: carregar ativo p/ operar: %w", err)
	}
	tradedOn, _ := time.Parse(tradeDateLayout, in.TradedOn) // já validado no handler
	tin := store.TradeInput{
		Quantity:       in.Quantity,
		UnitPriceCents: in.UnitPriceCents,
		TradedOn:       tradedOn,
		AccountID:      in.AccountId,
	}
	if err := s.store.RecordTrade(ctx, userID, assetID, in.Side, asset.Ticker, tin); err != nil {
		return AssetDetail{}, fmt.Errorf("investimentos: operar (%s): %w", in.Side, err)
	}
	return s.assetDetail(ctx, userID, assetID)
}

// DeleteTrade exclui uma operação; a posição recomputa no próximo read. store.ErrTradeNotFound → 404.
func (s *Service) DeleteTrade(ctx context.Context, userID, assetID, tradeID string) error {
	if err := s.store.DeleteTrade(ctx, userID, assetID, tradeID); err != nil {
		return fmt.Errorf("investimentos: excluir operação: %w", err)
	}
	return nil
}

// assetDetail compõe o detalhe: posição derivada (404 se o ativo não é do usuário) + operações.
func (s *Service) assetDetail(ctx context.Context, userID, id string) (AssetDetail, error) {
	pos, err := s.store.GetAssetPosition(ctx, userID, id)
	if err != nil {
		return AssetDetail{}, fmt.Errorf("investimentos: posição do ativo: %w", err)
	}
	trades, err := s.store.ListTradesByAsset(ctx, userID, id)
	if err != nil {
		return AssetDetail{}, fmt.Errorf("investimentos: operações do ativo: %w", err)
	}
	out := AssetDetail{AssetPosition: assetPosition(pos), Trades: make([]Trade, 0, len(trades))}
	for _, t := range trades {
		out.Trades = append(out.Trades, Trade{
			ID:             t.ID,
			Side:           t.Side,
			Quantity:       t.Quantity,
			UnitPriceCents: t.UnitPriceCents,
			TradedOn:       t.TradedOn.Format(tradeDateLayout),
			AccountId:      t.AccountID,
		})
	}
	return out, nil
}

// assetPosition mapeia a linha derivada do store no DTO de posição de ativo (gain = valor − custo).
func assetPosition(r store.PositionRow) AssetPosition {
	gain := r.CurrentValueCents - r.CostBasisCents
	return AssetPosition{
		ID:                r.ID,
		Ticker:            r.Ticker,
		Name:              r.Name,
		AssetClass:        r.AssetClass,
		Icon:              r.Icon,
		CurrentPriceCents: r.CurrentPriceCents,
		NetQuantity:       r.NetQuantity,
		AvgPriceCents:     r.AvgPriceCents,
		CostBasisCents:    r.CostBasisCents,
		CurrentValueCents: r.CurrentValueCents,
		GainCents:         gain,
		GainPct:           gainPercent(gain, r.CostBasisCents),
		RealizedCents:     r.RealizedCents,
	}
}
