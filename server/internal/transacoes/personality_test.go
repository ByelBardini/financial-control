package transacoes

import (
	"testing"
	"time"
)

// Teste white-box (package transacoes) das regrinhas de personalidade e formatação —
// mesmo espírito de contas/personality_test.go. Foca nas fronteiras dos limiares. A
// matemática de porcentagem (round/clamp) vive em internal/pct e é coberta lá.

func TestDirectionView(t *testing.T) {
	if got := directionView("income"); got != "inflow" {
		t.Errorf("directionView(income) = %q, quero inflow", got)
	}
	if got := directionView("expense"); got != "outflow" {
		t.Errorf("directionView(expense) = %q, quero outflow", got)
	}
}

func TestDateLabel(t *testing.T) {
	cases := []struct {
		y, m, d int
		want    string
	}{
		{2026, 6, 12, "12 JUN"},
		{2026, 10, 5, "05 OUT"},
		{2026, 1, 1, "01 JAN"},
		{2026, 12, 31, "31 DEZ"},
	}
	for _, tc := range cases {
		got := dateLabel(time.Date(tc.y, time.Month(tc.m), tc.d, 0, 0, 0, 0, time.UTC))
		if got != tc.want {
			t.Errorf("dateLabel(%d-%02d-%02d) = %q, quero %q", tc.y, tc.m, tc.d, got, tc.want)
		}
	}
}

func TestTimeLabel(t *testing.T) {
	got := timeLabel(time.Date(2026, 6, 5, 0, 0, 0, 0, time.UTC))
	if got != "05/06" {
		t.Errorf("timeLabel = %q, quero 05/06", got)
	}
}

func TestTransactionTag(t *testing.T) {
	cases := []struct {
		name                       string
		direction, kind, essential string
		recurring                  bool
		wantTag, wantTone          string
	}{
		{"despesa essencial avulsa", "expense", "standard", "essential", false, "Sobrevivência", "error"},
		{"despesa supérflua avulsa", "expense", "standard", "discretionary", false, "Supérfluo", "primary"},
		{"despesa recorrente vira Fixo", "expense", "standard", "essential", true, "Fixo", "primary"},
		{"parcela vira Parcelado (precede tudo)", "expense", "installment", "essential", true, "Parcelado", "primary"},
		{"receita recorrente vira Inflow Esperado", "income", "standard", "discretionary", true, "Inflow Esperado", "secondary"},
		{"receita avulsa vira Renda Extra", "income", "standard", "discretionary", false, "Renda Extra", "secondary"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			tag, tone := transactionTag(tc.direction, tc.kind, tc.essential, tc.recurring)
			if tag != tc.wantTag || tone != tc.wantTone {
				t.Errorf("transactionTag(%q,%q,%q,%v) = (%q,%q), quero (%q,%q)",
					tc.direction, tc.kind, tc.essential, tc.recurring, tag, tone, tc.wantTag, tc.wantTone)
			}
		})
	}
}

func TestCollapseForecastNasFronteiras(t *testing.T) {
	cases := []struct {
		name             string
		receitas, gastos int64
		wantPct          int
		wantLevel, wantT string
		wantNote         string
	}{
		{"sem gasto", 100000, 0, 0, "30 Dias", "secondary", "Dá pra respirar. Por enquanto."},
		{"fronteira 40 → primary", 100000, 40000, 40, "30 Dias", "primary", "Dá pra respirar. Por enquanto."},
		{"fronteira 80 → error", 100000, 80000, 80, "7 Dias", "error", "Otimismo é para quem tem limite no cartão."},
		{"estourado clampa", 100000, 120000, 100, "0 Dias", "error", "Otimismo é para quem tem limite no cartão."},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			pm := collapseForecast(tc.receitas, tc.gastos)
			if pm.Percent != tc.wantPct || pm.LevelTone != tc.wantT || pm.LevelLabel != tc.wantLevel {
				t.Errorf("collapseForecast(%d,%d) = {%d,%q,%q}, quero {%d,%q,%q}",
					tc.receitas, tc.gastos, pm.Percent, pm.LevelLabel, pm.LevelTone, tc.wantPct, tc.wantLevel, tc.wantT)
			}
			if pm.Note != tc.wantNote {
				t.Errorf("note = %q, quero %q", pm.Note, tc.wantNote)
			}
			if pm.LowLabel != "Tranquilo" || pm.HighLabel != "Colapso" {
				t.Errorf("rótulos extremos = %q/%q, quero Tranquilo/Colapso", pm.LowLabel, pm.HighLabel)
			}
		})
	}
}

func TestDebtLabelTiraSufixo(t *testing.T) {
	cases := []struct{ in, want string }{
		{"Fone (1/3)", "Fone"},
		{"Geladeira (10/12)", "Geladeira"},
		{"Sem sufixo", "Sem sufixo"},
	}
	for _, tc := range cases {
		if got := debtLabel(tc.in); got != tc.want {
			t.Errorf("debtLabel(%q) = %q, quero %q", tc.in, got, tc.want)
		}
	}
}

func TestInstallmentLabel(t *testing.T) {
	if got := installmentLabel(2, 3); got != "Parcela 2/3" {
		t.Errorf("installmentLabel(2,3) = %q, quero Parcela 2/3", got)
	}
}

func TestDebtToneENotaNasFronteiras(t *testing.T) {
	if tone := debtTone(79); tone != "primary" {
		t.Errorf("debtTone(79) = %q, quero primary", tone)
	}
	if tone := debtTone(80); tone != "error" {
		t.Errorf("debtTone(80) = %q, quero error", tone)
	}
	if note := debtNote(80); note != "Quase quitado. Respira." {
		t.Errorf("debtNote(80) = %q", note)
	}
	if note := debtNote(50); note != "Decisão financeira questionável." {
		t.Errorf("debtNote(50) = %q", note)
	}
}
