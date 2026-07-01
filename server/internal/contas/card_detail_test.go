package contas_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"financial-control/server/internal/contas"
	"financial-control/server/internal/store"
)

// cardEntry monta um lançamento do cartão (o store devolve ordenado por data desc).
func cardEntry(id, month string, day int, dir string, cents int64, desc, kind string) store.CardEntryRow {
	mm, _ := time.Parse("2006-01", month)
	return store.CardEntryRow{
		ID:          id,
		Month:       month,
		OccurredOn:  time.Date(mm.Year(), mm.Month(), day, 0, 0, 0, 0, time.UTC),
		Description: desc,
		Direction:   dir,
		AmountCents: cents,
		Kind:        kind,
	}
}

func TestCardDetailCabecalhoEFaturasPorMes(t *testing.T) {
	fake := &fakeContasStore{
		cardSummary: store.CardSummaryRow{
			ID: "c1", Name: "Nubank", Icon: "credit_card", DotColor: "#8a05be",
			LimitCents: 200000, BalanceCents: -65000,
		},
		// Já em ordem decrescente de data (como o store entrega). Junho antes de Março.
		cardEntries: []store.CardEntryRow{
			cardEntry("e1", "2026-06", 15, "income", 5000, "Pagamento fatura", "transfer"),
			cardEntry("e2", "2026-06", 10, "expense", 12000, "Mercado", "standard"),
			cardEntry("e3", "2026-06", 5, "expense", 8000, "Uber", "standard"),
			cardEntry("e4", "2026-03", 20, "expense", 50000, "Notebook", "standard"),
		},
	}
	got, err := contas.NewService(fake).CardDetail(context.Background(), "u-1", "c1")
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if fake.gotUserID != "u-1" || fake.gotCardID != "c1" {
		t.Errorf("store recebeu {user %q, card %q}, quero {u-1, c1} (escopo)", fake.gotUserID, fake.gotCardID)
	}
	// Cabeçalho derivado do saldo all-time (mesma matemática do creditCardView).
	if got.InvoiceCents != 65000 || got.AvailableCents != 135000 || got.UsedPercent != 33 {
		t.Errorf("cabeçalho = {fatura %d, disp %d, uso %d}, quero {65000, 135000, 33}", got.InvoiceCents, got.AvailableCents, got.UsedPercent)
	}
	if got.LimitCents != 200000 || got.BrandColor != "#8a05be" || got.Name != "Nubank" {
		t.Errorf("cabeçalho = {limite %d, cor %q, nome %q}", got.LimitCents, got.BrandColor, got.Name)
	}
	if len(got.Months) != 2 {
		t.Fatalf("len meses = %d, quero 2 (Junho e Março)", len(got.Months))
	}
	jun := got.Months[0]
	if jun.Month != "2026-06" || jun.Label != "Junho/2026" {
		t.Errorf("mês 0 = {%q,%q}, quero {2026-06, Junho/2026}", jun.Month, jun.Label)
	}
	if jun.ChargesCents != 20000 || jun.PaymentsCents != 5000 || jun.NetCents != 15000 {
		t.Errorf("fatura junho = {compras %d, pagtos %d, líquido %d}, quero {20000, 5000, 15000}", jun.ChargesCents, jun.PaymentsCents, jun.NetCents)
	}
	if len(jun.Entries) != 3 || jun.Entries[0].Direction != "inflow" || jun.Entries[0].Kind != "transfer" {
		t.Errorf("lançamentos junho = %+v, quero 3 com o pagamento (inflow/transfer) primeiro", jun.Entries)
	}
	mar := got.Months[1]
	if mar.Month != "2026-03" || mar.Label != "Março/2026" || mar.NetCents != 50000 {
		t.Errorf("fatura março = {%q,%q,%d}, quero {2026-03, Março/2026, 50000}", mar.Month, mar.Label, mar.NetCents)
	}
}

func TestCardDetailVazioDisponivelIgualLimite(t *testing.T) {
	fake := &fakeContasStore{cardSummary: store.CardSummaryRow{ID: "c1", LimitCents: 150000, BalanceCents: 0}}
	got, err := contas.NewService(fake).CardDetail(context.Background(), "u-1", "c1")
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if got.InvoiceCents != 0 || got.AvailableCents != 150000 || got.UsedPercent != 0 {
		t.Errorf("cartão vazio = {fatura %d, disp %d, uso %d}, quero {0, 150000, 0}", got.InvoiceCents, got.AvailableCents, got.UsedPercent)
	}
	if got.Months == nil || len(got.Months) != 0 {
		t.Errorf("meses = %v, quero slice não-nil vazio", got.Months)
	}
}

func TestCardDetailNaoEncontrado(t *testing.T) {
	fake := &fakeContasStore{cardErr: store.ErrCardNotFound}
	_, err := contas.NewService(fake).CardDetail(context.Background(), "u-1", "x")
	if !errors.Is(err, store.ErrCardNotFound) {
		t.Errorf("err = %v, quero ErrCardNotFound (handler → 404)", err)
	}
}
