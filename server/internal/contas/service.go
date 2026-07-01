package contas

import (
	"context"
	"fmt"

	"financial-control/server/internal/pct"
	"financial-control/server/internal/store"
)

const (
	cashConfidenceLabel = "Confiança Financeira"
	xrayTitle           = "Raio-X de Pobreza"
	debtRowLabel        = "Dívidas no cartão"
	limitRowLabel       = "Limite disponível"
)

// ContasStore é a dependência de dados das views de Contas (escopada por usuário).
type ContasStore interface {
	ListBankAccounts(ctx context.Context, userID string) ([]store.BankAccountRow, error)
	ListVoucherAccounts(ctx context.Context, userID string) ([]store.VoucherRow, error)
	GetCashBalance(ctx context.Context, userID string) (int64, error)
	ListCreditAccounts(ctx context.Context, userID string) ([]store.CreditAccountRow, error)
	GetCardSummary(ctx context.Context, userID, cardID string) (store.CardSummaryRow, error)
	ListCardEntries(ctx context.Context, userID, cardID string) ([]store.CardEntryRow, error)
}

// Service agrega as views da tela de Contas: junta o dado real do store com a
// personalidade derivada (notes/quips/panic). Sem estado além do store.
type Service struct {
	store ContasStore
}

// NewService injeta a dependência de dados.
func NewService(s ContasStore) *Service {
	return &Service{store: s}
}

// Banks lista as contas de banco com saldo e ironia derivada.
func (s *Service) Banks(ctx context.Context, userID string) ([]BankAccount, error) {
	rows, err := s.store.ListBankAccounts(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("contas: listar bancos: %w", err)
	}
	out := make([]BankAccount, 0, len(rows))
	for _, r := range rows {
		note, tone := bankNote(r.BalanceCents)
		out = append(out, BankAccount{
			ID:           r.ID,
			Name:         r.Name,
			Subtitle:     r.Subtitle,
			BalanceCents: r.BalanceCents,
			Icon:         r.Icon,
			BrandColor:   r.DotColor,
			Note:         note,
			NoteTone:     tone,
		})
	}
	return out, nil
}

// Vouchers lista os vales com % restante (saldo/concedido) + status/ironia derivados.
func (s *Service) Vouchers(ctx context.Context, userID string) ([]Voucher, error) {
	rows, err := s.store.ListVoucherAccounts(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("contas: listar vales: %w", err)
	}
	out := make([]Voucher, 0, len(rows))
	for _, r := range rows {
		remaining := pct.Clamp(r.BalanceCents, r.GrantedCents)
		note, tone := voucherNote(remaining)
		out = append(out, Voucher{
			ID:               r.ID,
			Name:             r.Name,
			ValueCents:       r.BalanceCents,
			Icon:             r.Icon,
			Status:           voucherStatus(remaining),
			RemainingPercent: remaining,
			Note:             note,
			NoteTone:         tone,
		})
	}
	return out, nil
}

// Cards lista os cartões de crédito por item: fatura (saldo negativo), limite,
// disponível (limite - fatura, ≥ 0), % usado e ironia derivada do uso.
func (s *Service) Cards(ctx context.Context, userID string) ([]CreditCard, error) {
	rows, err := s.store.ListCreditAccounts(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("contas: listar cartões: %w", err)
	}
	out := make([]CreditCard, 0, len(rows))
	for _, r := range rows {
		out = append(out, creditCardView(r))
	}
	return out, nil
}

// creditCardView deriva a visão de um cartão: fatura (saldo negativo), disponível
// (limite − fatura, ≥ 0), % usado (0..100) e a ironia do uso. Pura (sem store).
func creditCardView(r store.CreditAccountRow) CreditCard {
	invoice, available, used := cardInvoice(r.BalanceCents, r.LimitCents)
	note, tone := cardNote(used)
	return CreditCard{
		ID:             r.ID,
		Name:           r.Name,
		InvoiceCents:   invoice,
		LimitCents:     r.LimitCents,
		AvailableCents: available,
		UsedPercent:    used,
		Icon:           r.Icon,
		BrandColor:     r.DotColor,
		Note:           note,
		NoteTone:       tone,
	}
}

// Cash devolve a carteira física (saldo + confiança/quip derivados).
func (s *Service) Cash(ctx context.Context, userID string) (CashWallet, error) {
	cents, err := s.store.GetCashBalance(ctx, userID)
	if err != nil {
		return CashWallet{}, fmt.Errorf("contas: saldo da carteira: %w", err)
	}
	return CashWallet{
		BalanceCents:      cents,
		Quip:              cashQuip(cents),
		ConfidenceLabel:   cashConfidenceLabel,
		ConfidencePercent: cashConfidence(cents),
	}, nil
}

// Xray monta o "Raio-X de Pobreza": dívida (saldo negativo dos cartões), limite
// disponível e o Panic Meter derivado da razão dívida/limite.
func (s *Service) Xray(ctx context.Context, userID string) (PovertyXray, error) {
	rows, err := s.store.ListCreditAccounts(ctx, userID)
	if err != nil {
		return PovertyXray{}, fmt.Errorf("contas: raio-x: %w", err)
	}
	var debtCents, limitCents int64
	for _, r := range rows {
		if r.BalanceCents < 0 {
			debtCents += -r.BalanceCents
		}
		limitCents += r.LimitCents
	}
	availableCents := limitCents - debtCents
	if availableCents < 0 {
		availableCents = 0
	}
	return PovertyXray{
		Title: xrayTitle,
		Rows: []XrayRow{
			{Label: debtRowLabel, Cents: debtCents, Tone: "error"},
			{Label: limitRowLabel, Cents: availableCents, Tone: "neutral"},
		},
		Panic: panicFrom(debtCents, limitCents),
	}, nil
}

// Tip devolve a "Dica de Gestão" (texto fixo derivado, sem ir ao banco).
func (s *Service) Tip() ManagementTip {
	return tip()
}
