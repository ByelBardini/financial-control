package patrimonio_test

import (
	"context"
	"errors"
	"testing"

	"financial-control/server/internal/patrimonio"
	"financial-control/server/internal/store"
)

// fakePatrimonioStore é o fake nomeado da dependência de dados (sem banco). Captura o userID
// pra provar o escopo; devolve geral em (false,false) e cripto em onlyCrypto.
type fakePatrimonioStore struct {
	breakdown store.LiquidBreakdownRow
	geral     []store.PositionRow
	cripto    []store.PositionRow
	err       error
	gotUserID string
}

func (f *fakePatrimonioStore) GetLiquidBreakdown(_ context.Context, userID string) (store.LiquidBreakdownRow, error) {
	f.gotUserID = userID
	return f.breakdown, f.err
}

func (f *fakePatrimonioStore) ListPositions(_ context.Context, userID string, _, onlyCrypto bool) ([]store.PositionRow, error) {
	f.gotUserID = userID
	if f.err != nil {
		return nil, f.err
	}
	if onlyCrypto {
		return f.cripto, nil
	}
	return f.geral, nil
}

func TestOverviewLiquidoEhBancosMaisEspecie(t *testing.T) {
	fake := &fakePatrimonioStore{
		breakdown: store.LiquidBreakdownRow{BankCents: 300000, CashCents: 43000, CardDebtCents: 32000, VoucherCents: 21500},
		geral: []store.PositionRow{
			{NetQuantity: "1.00000000", CurrentValueCents: 1400000},
			{NetQuantity: "0.00000000", CurrentValueCents: 999999}, // zerada: não conta
		},
		cripto: []store.PositionRow{{NetQuantity: "0.00150000", CurrentValueCents: 100000}},
	}
	got, err := patrimonio.NewService(fake).Overview(context.Background(), "u-1")
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if fake.gotUserID != "u-1" {
		t.Errorf("store recebeu userID %q, quero u-1 (escopo)", fake.gotUserID)
	}
	want := patrimonio.Overview{
		LiquidBalanceCents: 343000, BankCents: 300000, CashCents: 43000,
		InvestedCents: 1400000, CryptoCents: 100000, CardDebtCents: 32000, VoucherCents: 21500,
	}
	if got != want {
		t.Errorf("got = %+v, quero %+v", got, want)
	}
	// Invariante de conciliação: o líquido é exatamente bancos + espécie.
	if got.LiquidBalanceCents != got.BankCents+got.CashCents {
		t.Errorf("líquido %d != bancos %d + espécie %d", got.LiquidBalanceCents, got.BankCents, got.CashCents)
	}
}

func TestOverviewAParteNaoEntraNoLiquido(t *testing.T) {
	// Mesmo com investimentos/cripto/cartão/vales altos, o líquido só reflete bancos + espécie.
	fake := &fakePatrimonioStore{
		breakdown: store.LiquidBreakdownRow{BankCents: 5000, CashCents: 0, CardDebtCents: 900000, VoucherCents: 80000},
		geral:     []store.PositionRow{{NetQuantity: "10.00000000", CurrentValueCents: 7000000}},
		cripto:    []store.PositionRow{{NetQuantity: "2.00000000", CurrentValueCents: 5000000}},
	}
	got, err := patrimonio.NewService(fake).Overview(context.Background(), "u-1")
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if got.LiquidBalanceCents != 5000 {
		t.Errorf("líquido = %d, quero 5000 (à parte não soma)", got.LiquidBalanceCents)
	}
}

func TestOverviewSemDadosZera(t *testing.T) {
	got, err := patrimonio.NewService(&fakePatrimonioStore{}).Overview(context.Background(), "u-1")
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if got != (patrimonio.Overview{}) {
		t.Errorf("sem dados = %+v, quero tudo zero", got)
	}
}

func TestOverviewPropagaErroDoStore(t *testing.T) {
	svc := patrimonio.NewService(&fakePatrimonioStore{err: errors.New("falha no banco")})
	if _, err := svc.Overview(context.Background(), "u-1"); err == nil {
		t.Error("esperava erro propagado do store")
	}
}
