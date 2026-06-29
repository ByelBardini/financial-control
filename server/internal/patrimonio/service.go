package patrimonio

import (
	"context"
	"fmt"

	"financial-control/server/internal/store"
)

// zeroQuantity é a quantidade líquida (string, 8 casas) de uma posição totalmente vendida.
// Mesma convenção do dashboard/investimentos — posição zerada não conta no patrimônio.
const zeroQuantity = "0.00000000"

// PatrimonioStore é a dependência de dados (escopada por usuário): a quebra das contas
// (líquido + à parte) e as posições da carteira — geral (cripto fora) e cripto separadas,
// pra o investido e o subtotal de cripto baterem com a tela de Investimentos.
type PatrimonioStore interface {
	GetLiquidBreakdown(ctx context.Context, userID string) (store.LiquidBreakdownRow, error)
	ListPositions(ctx context.Context, userID string, includeCrypto, onlyCrypto bool) ([]store.PositionRow, error)
}

// Service monta o Overview a partir do store.
type Service struct {
	store PatrimonioStore
}

// NewService injeta o store.
//
//	svc := patrimonio.NewService(st)
func NewService(s PatrimonioStore) *Service {
	return &Service{store: s}
}

// Overview devolve a quebra do patrimônio do usuário: líquido (bancos + espécie) +
// investimentos/cripto/cartão/vales à parte. Invariante: LiquidBalanceCents = bank + cash;
// os campos à parte NUNCA entram no líquido. Investido geral = ListPositions(false,false) e
// cripto = ListPositions(true,true), iguais às fontes da tela de Investimentos.
func (s *Service) Overview(ctx context.Context, userID string) (Overview, error) {
	b, err := s.store.GetLiquidBreakdown(ctx, userID)
	if err != nil {
		return Overview{}, fmt.Errorf("patrimonio: quebra do líquido: %w", err)
	}
	geral, err := s.store.ListPositions(ctx, userID, false, false)
	if err != nil {
		return Overview{}, fmt.Errorf("patrimonio: posições gerais: %w", err)
	}
	cripto, err := s.store.ListPositions(ctx, userID, true, true)
	if err != nil {
		return Overview{}, fmt.Errorf("patrimonio: posições de cripto: %w", err)
	}
	return Overview{
		LiquidBalanceCents: b.BankCents + b.CashCents,
		BankCents:          b.BankCents,
		CashCents:          b.CashCents,
		InvestedCents:      openValue(geral),
		CryptoCents:        openValue(cripto),
		CardDebtCents:      b.CardDebtCents,
		VoucherCents:       b.VoucherCents,
	}, nil
}

// openValue soma o valor atual das posições abertas (ignora as zeradas/totalmente vendidas).
func openValue(rows []store.PositionRow) int64 {
	var total int64
	for _, r := range rows {
		if r.NetQuantity != zeroQuantity {
			total += r.CurrentValueCents
		}
	}
	return total
}
