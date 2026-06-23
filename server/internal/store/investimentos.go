package store

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"financial-control/server/internal/store/gen"
)

// ErrAssetNotFound sinaliza ativo de investimento inexistente (ou de outro usuário, ou
// arquivado) — o handler o trata como 404 (detalhe/edição) ou 400 (operação numa conta inválida).
var ErrAssetNotFound = errors.New("ativo não encontrado")

// ErrTradeNotFound sinaliza operação inexistente (ou de outro usuário) — handler trata como 404.
var ErrTradeNotFound = errors.New("operação não encontrada")

// ErrInsufficientQuantity sinaliza venda maior que a posição líquida do ativo — handler → 400.
var ErrInsufficientQuantity = errors.New("quantidade insuficiente para vender")

// ErrTradeAccountInvalid sinaliza a conta de liquidação inexistente/de outro usuário/arquivada na
// operação — o handler a trata como 400 (a conta do corpo não serve).
var ErrTradeAccountInvalid = errors.New("conta de liquidação inválida")

// PositionRow é a posição derivada de um ativo: metadados + números já em centavos (preço médio
// móvel, custo, valor atual, realizado) + quantidade líquida como string decimal (8 casas).
type PositionRow struct {
	ID                string
	Ticker            string
	Name              string
	AssetClass        string
	Icon              string
	CurrentPriceCents int64
	NetQuantity       string
	CostBasisCents    int64
	CurrentValueCents int64
	AvgPriceCents     int64
	RealizedCents     int64
}

// CryptoSeriesRow é um ponto do histórico de preço de uma cripto (centavos), p/ o gráfico.
type CryptoSeriesRow struct {
	AssetID    string
	PriceCents int64
}

// AssetMetaRow são os metadados de um ativo (sem posição) — checagem de posse + pré-preencher edição.
type AssetMetaRow struct {
	ID                string
	Ticker            string
	Name              string
	AssetClass        string
	Icon              string
	CurrentPriceCents int64
}

// TradeRow é uma operação (compra/venda) com quantidade como string decimal e preço em centavos.
// AccountID = conta de liquidação (vazio nos trades legados/seed sem caixa).
type TradeRow struct {
	ID             string
	Side           string
	Quantity       string
	UnitPriceCents int64
	TradedOn       time.Time
	AccountID      string
}

// AssetInput são os campos graváveis de um ativo. AssetClass é ignorado no update (imutável).
type AssetInput struct {
	Ticker            string
	Name              string
	AssetClass        string
	Icon              string
	CurrentPriceCents int64
}

// TradeInput é uma operação a registrar: Quantity é string decimal (validada no service), preço
// em centavos, data de competência, e a conta de liquidação (debita na compra / credita na venda).
type TradeInput struct {
	Quantity       string
	UnitPriceCents int64
	TradedOn       time.Time
	AccountID      string
}

// ListPositions devolve a posição derivada de cada ativo do usuário (preço médio móvel).
// includeCrypto/onlyCrypto separam o portfólio geral da cripto à parte.
func (s *Store) ListPositions(ctx context.Context, userID string, includeCrypto, onlyCrypto bool) ([]PositionRow, error) {
	uid, err := uuidArg(userID)
	if err != nil {
		return nil, err
	}
	rows, err := s.q.ListPositions(ctx, gen.ListPositionsParams{
		UserID:        uid,
		AssetID:       pgtype.UUID{}, // NULL = todos os ativos
		IncludeCrypto: includeCrypto,
		OnlyCrypto:    onlyCrypto,
	})
	if err != nil {
		return nil, fmt.Errorf("store: listar posições: %w", err)
	}
	out := make([]PositionRow, 0, len(rows))
	for _, r := range rows {
		out = append(out, positionRow(r))
	}
	return out, nil
}

// GetAssetPosition devolve a posição derivada de um único ativo (escopado por id + user).
// ErrAssetNotFound quando não existe, não é do usuário ou está arquivado.
func (s *Store) GetAssetPosition(ctx context.Context, userID, assetID string) (PositionRow, error) {
	uid, err := uuidArg(userID)
	if err != nil {
		return PositionRow{}, err
	}
	aid, err := uuidArg(assetID)
	if err != nil {
		return PositionRow{}, ErrAssetNotFound
	}
	rows, err := s.q.ListPositions(ctx, gen.ListPositionsParams{
		UserID:        uid,
		AssetID:       aid,
		IncludeCrypto: true,
		OnlyCrypto:    false,
	})
	if err != nil {
		return PositionRow{}, fmt.Errorf("store: posição do ativo: %w", err)
	}
	if len(rows) == 0 {
		return PositionRow{}, ErrAssetNotFound
	}
	return positionRow(rows[0]), nil
}

// ListCryptoSeries devolve o histórico de preço (centavos) das criptos do usuário, cronológico.
func (s *Store) ListCryptoSeries(ctx context.Context, userID string) ([]CryptoSeriesRow, error) {
	uid, err := uuidArg(userID)
	if err != nil {
		return nil, err
	}
	rows, err := s.q.ListCryptoSeries(ctx, uid)
	if err != nil {
		return nil, fmt.Errorf("store: série de preços da cripto: %w", err)
	}
	out := make([]CryptoSeriesRow, 0, len(rows))
	for _, r := range rows {
		out = append(out, CryptoSeriesRow{AssetID: r.AssetID, PriceCents: r.PriceCents})
	}
	return out, nil
}

// GetAssetNetQuantity devolve a quantidade líquida (string) de um ativo — p/ mensagem de erro.
func (s *Store) GetAssetNetQuantity(ctx context.Context, userID, assetID string) (string, error) {
	uid, err := uuidArg(userID)
	if err != nil {
		return "", err
	}
	aid, err := uuidArg(assetID)
	if err != nil {
		return "", ErrAssetNotFound
	}
	qty, err := s.q.GetAssetNetQuantity(ctx, gen.GetAssetNetQuantityParams{AssetID: aid, UserID: uid})
	if err != nil {
		return "", fmt.Errorf("store: quantidade líquida do ativo: %w", err)
	}
	return qty, nil
}

// GetAssetByID devolve os metadados do ativo (escopado por id + user). ErrAssetNotFound quando não existe.
func (s *Store) GetAssetByID(ctx context.Context, userID, assetID string) (AssetMetaRow, error) {
	uid, err := uuidArg(userID)
	if err != nil {
		return AssetMetaRow{}, err
	}
	aid, err := uuidArg(assetID)
	if err != nil {
		return AssetMetaRow{}, ErrAssetNotFound
	}
	row, err := s.q.GetAssetByID(ctx, gen.GetAssetByIDParams{ID: aid, UserID: uid})
	if errors.Is(err, pgx.ErrNoRows) {
		return AssetMetaRow{}, ErrAssetNotFound
	}
	if err != nil {
		return AssetMetaRow{}, fmt.Errorf("store: buscar ativo por id: %w", err)
	}
	return AssetMetaRow{
		ID:                row.ID,
		Ticker:            row.Ticker,
		Name:              row.Name,
		AssetClass:        row.AssetClass,
		Icon:              row.Icon,
		CurrentPriceCents: row.CurrentPriceCents,
	}, nil
}

// ListTradesByAsset devolve as operações de um ativo (escopado por asset + user), cronológico.
func (s *Store) ListTradesByAsset(ctx context.Context, userID, assetID string) ([]TradeRow, error) {
	uid, err := uuidArg(userID)
	if err != nil {
		return nil, err
	}
	aid, err := uuidArg(assetID)
	if err != nil {
		return nil, ErrAssetNotFound
	}
	rows, err := s.q.ListTradesByAsset(ctx, gen.ListTradesByAssetParams{AssetID: aid, UserID: uid})
	if err != nil {
		return nil, fmt.Errorf("store: listar operações: %w", err)
	}
	out := make([]TradeRow, 0, len(rows))
	for _, r := range rows {
		out = append(out, TradeRow{
			ID:             r.ID,
			Side:           r.Side,
			Quantity:       r.Quantity,
			UnitPriceCents: r.UnitPriceCents,
			TradedOn:       r.TradedOn.Time,
			AccountID:      r.AccountID,
		})
	}
	return out, nil
}

// CreateAsset cria um ativo do usuário e devolve o novo id.
func (s *Store) CreateAsset(ctx context.Context, userID string, in AssetInput) (string, error) {
	uid, err := uuidArg(userID)
	if err != nil {
		return "", err
	}
	id, err := s.q.CreateAsset(ctx, gen.CreateAssetParams{
		UserID:            uid,
		Ticker:            in.Ticker,
		Name:              in.Name,
		AssetClass:        in.AssetClass,
		Icon:              in.Icon,
		CurrentPriceCents: in.CurrentPriceCents,
	})
	if err != nil {
		return "", fmt.Errorf("store: criar ativo: %w", err)
	}
	return id, nil
}

// UpdateAsset edita metadados + preço atual do ativo (escopado por id + user). AssetClass é imutável.
// ErrAssetNotFound quando não existe ou está arquivado.
func (s *Store) UpdateAsset(ctx context.Context, userID, assetID string, in AssetInput) error {
	uid, err := uuidArg(userID)
	if err != nil {
		return err
	}
	aid, err := uuidArg(assetID)
	if err != nil {
		return ErrAssetNotFound
	}
	if _, err := s.q.UpdateAsset(ctx, gen.UpdateAssetParams{
		Ticker:            in.Ticker,
		Name:              in.Name,
		Icon:              in.Icon,
		CurrentPriceCents: in.CurrentPriceCents,
		ID:                aid,
		UserID:            uid,
	}); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrAssetNotFound
		}
		return fmt.Errorf("store: editar ativo: %w", err)
	}
	return nil
}

// ArchiveAsset faz soft-delete do ativo (escopado por id + user). ErrAssetNotFound quando não existe.
func (s *Store) ArchiveAsset(ctx context.Context, userID, assetID string) error {
	uid, err := uuidArg(userID)
	if err != nil {
		return err
	}
	aid, err := uuidArg(assetID)
	if err != nil {
		return ErrAssetNotFound
	}
	if _, err := s.q.ArchiveAsset(ctx, gen.ArchiveAssetParams{ID: aid, UserID: uid}); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrAssetNotFound
		}
		return fmt.Errorf("store: arquivar ativo: %w", err)
	}
	return nil
}

// AppendPriceObservation grava um ponto de histórico de preço; devolve nº de linhas (0 = ativo
// não é do usuário). Usado quando o preço atual é definido/atualizado.
func (s *Store) AppendPriceObservation(ctx context.Context, userID, assetID string, priceCents int64, observedOn time.Time) (int64, error) {
	uid, err := uuidArg(userID)
	if err != nil {
		return 0, err
	}
	aid, err := uuidArg(assetID)
	if err != nil {
		return 0, ErrAssetNotFound
	}
	n, err := s.q.AppendPriceObservation(ctx, gen.AppendPriceObservationParams{
		UserID:     uid,
		AssetID:    aid,
		PriceCents: priceCents,
		ObservedOn: dateArg(observedOn),
	})
	if err != nil {
		return 0, fmt.Errorf("store: gravar preço: %w", err)
	}
	return n, nil
}

// RecordTrade registra a operação (compra/venda) E a transação de caixa na conta de liquidação,
// ATOMICAMENTE (pgx.Tx): compra debita (expense), venda credita (income), amount = qtd × preço.
// O service carrega o ativo antes (404). Aqui: venda sem saldo → ErrInsufficientQuantity; conta
// inválida → ErrTradeAccountInvalid. Preço 0 (bonificação) → registra só o trade, sem caixa.
func (s *Store) RecordTrade(ctx context.Context, userID, assetID, side, ticker string, in TradeInput) error {
	uid, err := uuidArg(userID)
	if err != nil {
		return err
	}
	aid, err := uuidArg(assetID)
	if err != nil {
		return ErrAssetNotFound
	}
	acc, err := uuidArg(in.AccountID)
	if err != nil {
		return ErrTradeAccountInvalid
	}
	qty, err := numericArg(in.Quantity)
	if err != nil {
		return err
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("store: abrir transação: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }() // no-op após Commit; rollback só atua se retornarmos antes
	q := s.q.WithTx(tx)

	var tradeID string
	if side == "sell" {
		tradeID, err = q.SellTrade(ctx, gen.SellTradeParams{UserID: uid, AssetID: aid, AccountID: acc, Quantity: qty, UnitPriceCents: in.UnitPriceCents, TradedOn: dateArg(in.TradedOn)})
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrInsufficientQuantity // ativo já validado pelo service → 0 linhas = guarda de saldo
		}
	} else {
		tradeID, err = q.BuyTrade(ctx, gen.BuyTradeParams{UserID: uid, AssetID: aid, AccountID: acc, Quantity: qty, UnitPriceCents: in.UnitPriceCents, TradedOn: dateArg(in.TradedOn)})
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrAssetNotFound
		}
	}
	if err != nil {
		return fmt.Errorf("store: registrar operação (%s): %w", side, err)
	}

	if in.UnitPriceCents > 0 {
		tid, err := uuidArg(tradeID)
		if err != nil {
			return err
		}
		direction, description := "expense", "Compra "+ticker
		if side == "sell" {
			direction, description = "income", "Venda "+ticker
		}
		if _, err := q.CreateInvestmentTransaction(ctx, gen.CreateInvestmentTransactionParams{
			TradeID:     tid,
			UserID:      uid,
			Description: description,
			Direction:   direction,
		}); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return ErrTradeAccountInvalid
			}
			return fmt.Errorf("store: liquidar operação na conta: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("store: confirmar operação: %w", err)
	}
	return nil
}

// DeleteTrade exclui uma operação (escopada por id + asset + user). A posição recomputa no read.
// ErrTradeNotFound quando não existe ou não é do usuário.
func (s *Store) DeleteTrade(ctx context.Context, userID, assetID, tradeID string) error {
	uid, err := uuidArg(userID)
	if err != nil {
		return err
	}
	aid, err := uuidArg(assetID)
	if err != nil {
		return ErrTradeNotFound
	}
	tid, err := uuidArg(tradeID)
	if err != nil {
		return ErrTradeNotFound
	}
	if _, err := s.q.DeleteTrade(ctx, gen.DeleteTradeParams{TradeID: tid, AssetID: aid, UserID: uid}); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrTradeNotFound
		}
		return fmt.Errorf("store: excluir operação: %w", err)
	}
	return nil
}

// positionRow mapeia a linha gerada pra PositionRow (campos 1:1).
func positionRow(r gen.ListPositionsRow) PositionRow {
	return PositionRow{
		ID:                r.ID,
		Ticker:            r.Ticker,
		Name:              r.Name,
		AssetClass:        r.AssetClass,
		Icon:              r.Icon,
		CurrentPriceCents: r.CurrentPriceCents,
		NetQuantity:       r.NetQuantity,
		CostBasisCents:    r.CostBasisCents,
		CurrentValueCents: r.CurrentValueCents,
		AvgPriceCents:     r.AvgPriceCents,
		RealizedCents:     r.RealizedCents,
	}
}

// numericArg converte uma quantidade (string decimal vinda da borda) no pgtype.Numeric das
// queries — sem aritmética decimal no Go. Formato inválido falha fechado (erro).
func numericArg(s string) (pgtype.Numeric, error) {
	var n pgtype.Numeric
	if err := n.Scan(s); err != nil {
		return pgtype.Numeric{}, fmt.Errorf("store: quantidade inválida (%q): %w", s, err)
	}
	return n, nil
}
