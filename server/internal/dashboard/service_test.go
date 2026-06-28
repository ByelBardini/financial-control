package dashboard_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"financial-control/server/internal/dashboard"
	"financial-control/server/internal/store"
)

// fakeDashStore é o fake nomeado da dependência de dados (sem banco real).
// Captura os userIDs recebidos pra provar o escopo por usuário em cada query.
type fakeDashStore struct {
	summary          store.MonthSummaryRow
	cats             []store.CategorySpendRow
	positions        []store.PositionRow
	err              error
	gotSummaryUserID string
	gotCatsUserID    string
	gotPosUserID     string
}

func (f *fakeDashStore) GetMonthSummary(_ context.Context, userID string, _ time.Time) (store.MonthSummaryRow, error) {
	f.gotSummaryUserID = userID
	return f.summary, f.err
}

func (f *fakeDashStore) ListCategorySpend(_ context.Context, userID string, _ time.Time) ([]store.CategorySpendRow, error) {
	f.gotCatsUserID = userID
	return f.cats, f.err
}

func (f *fakeDashStore) ListPositions(_ context.Context, userID string, _, _ bool) ([]store.PositionRow, error) {
	f.gotPosUserID = userID
	return f.positions, f.err
}

func TestMonthBalanceNetEPersonalidade(t *testing.T) {
	cases := []struct {
		name       string
		receitas   int64
		gastos     int64
		wantNet    int64
		wantStatus string
	}{
		{"sem dados", 0, 0, 0, "No vácuo"},
		{"receita sem gasto", 100000, 0, 100000, "No vácuo"},
		{"no controle (40%)", 100000, 40000, 60000, "No controle"},
		{"sobrevivendo (60%)", 100000, 60000, 40000, "Sobrevivendo"},
		{"no limite (85%)", 100000, 85000, 15000, "No limite"},
		{"no vermelho (120%)", 100000, 120000, -20000, "No vermelho"},
		{"gasto sem receita", 0, 50000, -50000, "No vácuo"},
		// Fronteiras exatas dos limiares (onde o < vs <= erraria por 1):
		{"fronteira 50% → sobrevivendo", 100000, 50000, 50000, "Sobrevivendo"},
		{"fronteira 80% → no limite", 100000, 80000, 20000, "No limite"},
		{"fronteira 100% → no vermelho", 100000, 100000, 0, "No vermelho"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			svc := dashboard.NewService(&fakeDashStore{summary: store.MonthSummaryRow{ReceitasCents: tc.receitas, GastosCents: tc.gastos}})
			got, err := svc.MonthBalance(context.Background(), "u-1", time.Now())
			if err != nil {
				t.Fatalf("erro inesperado: %v", err)
			}
			if got.NetCents != tc.wantNet {
				t.Errorf("netCents = %d, quero %d", got.NetCents, tc.wantNet)
			}
			if got.StatusLabel != tc.wantStatus {
				t.Errorf("statusLabel = %q, quero %q", got.StatusLabel, tc.wantStatus)
			}
			if got.AvailableLabel != "Disponível para gastar" {
				t.Errorf("availableLabel = %q", got.AvailableLabel)
			}
			if got.InvestidoCents != 0 {
				t.Errorf("investidoCents = %d, quero 0", got.InvestidoCents)
			}
		})
	}
}

func TestCategoriesShareEmPercent(t *testing.T) {
	svc := dashboard.NewService(&fakeDashStore{cats: []store.CategorySpendRow{
		{ID: "c1", Label: "Alimentação", Tone: "primary", AmountCents: 60000},
		{ID: "c2", Label: "Transporte", Tone: "secondary", AmountCents: 30000},
	}})
	got, err := svc.Categories(context.Background(), "u-1", time.Now())
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("len = %d, quero 2", len(got))
	}
	if got[0].Percent != 67 || got[1].Percent != 33 { // total 90000: 60000→67%, 30000→33%
		t.Errorf("percent = %d/%d, quero 67/33", got[0].Percent, got[1].Percent)
	}
	// pass-through fiel dos campos do store (pega mapeamento trocado de coluna):
	first := dashboard.CategorySpend{ID: "c1", Label: "Alimentação", AmountCents: 60000, Percent: 67, Tone: "primary"}
	if got[0] != first {
		t.Errorf("got[0] = %+v, quero %+v", got[0], first)
	}
	if got[1].Tone != "secondary" { // Tone não pode ser hardcoded
		t.Errorf("tone de got[1] = %q, quero secondary", got[1].Tone)
	}
}

func TestCategoriesVaziaNaoQuebra(t *testing.T) {
	svc := dashboard.NewService(&fakeDashStore{cats: []store.CategorySpendRow{}})
	got, err := svc.Categories(context.Background(), "u-1", time.Now())
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if got == nil || len(got) != 0 {
		t.Errorf("got = %v, quero slice vazia não-nil", got)
	}
}

func TestEsteMesVillainESpentPercent(t *testing.T) {
	svc := dashboard.NewService(&fakeDashStore{
		summary: store.MonthSummaryRow{ReceitasCents: 320000, GastosCents: 111550},
		cats:    []store.CategorySpendRow{{Label: "Alimentação", AmountCents: 60000}},
	})
	got, err := svc.EsteMes(context.Background(), "u-1", time.Now())
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if got.SpentPercent != 35 { // 111550/320000 ≈ 34.9 → 35
		t.Errorf("spentPercent = %d, quero 35", got.SpentPercent)
	}
	if got.BiggestVillain != "Alimentação" {
		t.Errorf("biggestVillain = %q, quero Alimentação", got.BiggestVillain)
	}
}

func TestEsteMesEscopaAsDuasQueriesPorUsuario(t *testing.T) {
	fake := &fakeDashStore{summary: store.MonthSummaryRow{ReceitasCents: 1000}, cats: []store.CategorySpendRow{{Label: "X", AmountCents: 100}}}
	if _, err := dashboard.NewService(fake).EsteMes(context.Background(), "u-9", time.Now()); err != nil {
		t.Fatalf("EsteMes: %v", err)
	}
	if fake.gotSummaryUserID != "u-9" || fake.gotCatsUserID != "u-9" {
		t.Fatalf("EsteMes escopou summary=%q cats=%q, quero u-9 nos dois", fake.gotSummaryUserID, fake.gotCatsUserID)
	}
}

func TestEsteMesSemCategoriasVillainVazio(t *testing.T) {
	svc := dashboard.NewService(&fakeDashStore{summary: store.MonthSummaryRow{ReceitasCents: 1000}, cats: []store.CategorySpendRow{}})
	got, err := svc.EsteMes(context.Background(), "u-1", time.Now())
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if got.BiggestVillain != "" {
		t.Errorf("biggestVillain = %q, quero vazio", got.BiggestVillain)
	}
}

func TestMonthBalancePropagaErroDoStore(t *testing.T) {
	svc := dashboard.NewService(&fakeDashStore{err: errors.New("falha no banco")})
	if _, err := svc.MonthBalance(context.Background(), "u-1", time.Now()); err == nil {
		t.Fatal("esperava erro propagado do store")
	}
}

func TestDiagnosisBodyPorNet(t *testing.T) {
	cases := []struct {
		name     string
		receitas int64
		gastos   int64
		wantBody string
	}{
		{"positivo", 1000, 0, "Você ainda não está falido. Continue assim."},
		{"zerado", 500, 500, "Empate técnico com a falência. Respira."},
		{"negativo", 0, 500, "O vermelho bateu. Hora de cortar o delivery."},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			svc := dashboard.NewService(&fakeDashStore{summary: store.MonthSummaryRow{ReceitasCents: tc.receitas, GastosCents: tc.gastos}})
			got, err := svc.Diagnosis(context.Background(), "u-1", time.Now())
			if err != nil {
				t.Fatalf("erro inesperado: %v", err)
			}
			if got.Title != "Diagnóstico Pobrify" {
				t.Errorf("title = %q", got.Title)
			}
			if got.Body != tc.wantBody {
				t.Errorf("body = %q, quero %q", got.Body, tc.wantBody)
			}
		})
	}
}

func TestInvestimentosVaziosQuandoSemPosicoes(t *testing.T) {
	svc := dashboard.NewService(&fakeDashStore{})
	inv, err := svc.Investments(context.Background(), "u-1")
	if err != nil {
		t.Fatalf("Investments: %v", err)
	}
	if inv == nil || len(inv) != 0 {
		t.Errorf("Investments() = %v, quero slice vazia não-nil", inv)
	}
	sum, err := svc.InvestmentsSummary(context.Background(), "u-1")
	if err != nil {
		t.Fatalf("InvestmentsSummary: %v", err)
	}
	if sum != (dashboard.InvestmentsSummary{}) {
		t.Errorf("InvestmentsSummary() = %+v, quero zerado", sum)
	}
}

func TestInvestimentosDerivamDasPosicoes(t *testing.T) {
	fake := &fakeDashStore{positions: []store.PositionRow{
		{ID: "a1", Ticker: "PETR4", Icon: "x", NetQuantity: "100.00000000", CostBasisCents: 100000, CurrentValueCents: 120000},
		{ID: "a2", Ticker: "VALE3", Icon: "y", NetQuantity: "0.00000000"}, // zerada → fora
		{ID: "a3", Ticker: "BTC", Icon: "z", NetQuantity: "0.50000000", CostBasisCents: 50000, CurrentValueCents: 45000},
	}}
	svc := dashboard.NewService(fake)

	inv, err := svc.Investments(context.Background(), "u-1")
	if err != nil {
		t.Fatalf("Investments: %v", err)
	}
	if len(inv) != 2 {
		t.Fatalf("len = %d, quero 2 (posição zerada fica fora)", len(inv))
	}
	if inv[0].Name != "PETR4" || inv[0].ValueCents != 120000 || inv[0].DailyChangePct != 20 {
		t.Errorf("inv[0] = %+v, quero PETR4 / 120000 / +20%%", inv[0])
	}
	if inv[1].Name != "BTC" || inv[1].DailyChangePct != -10 { // 45000 vs custo 50000 = -10%
		t.Errorf("inv[1] = %+v, quero BTC / -10%%", inv[1])
	}

	sum, err := svc.InvestmentsSummary(context.Background(), "u-1")
	if err != nil {
		t.Fatalf("InvestmentsSummary: %v", err)
	}
	// total 165000, custo 150000 → ganho 15000, pct 10%
	if sum.TotalCents != 165000 || sum.ChangeCents != 15000 || sum.ChangePct != 10 {
		t.Errorf("summary = %+v, quero {165000, 15000, 10}", sum)
	}
	if fake.gotPosUserID != "u-1" {
		t.Errorf("escopo do userID = %q, quero u-1", fake.gotPosUserID)
	}
}

func TestMonthBalanceInvestidoSomaPosicoesAbertas(t *testing.T) {
	fake := &fakeDashStore{
		summary: store.MonthSummaryRow{ReceitasCents: 100000, GastosCents: 40000},
		positions: []store.PositionRow{
			{ID: "a1", NetQuantity: "10.00000000", CurrentValueCents: 120000},
			{ID: "a2", NetQuantity: "0.00000000", CurrentValueCents: 0}, // zerada → não soma
		},
	}
	got, err := dashboard.NewService(fake).MonthBalance(context.Background(), "u-1", time.Now())
	if err != nil {
		t.Fatalf("MonthBalance: %v", err)
	}
	if got.InvestidoCents != 120000 {
		t.Errorf("investidoCents = %d, quero 120000 (só posições abertas)", got.InvestidoCents)
	}
}
