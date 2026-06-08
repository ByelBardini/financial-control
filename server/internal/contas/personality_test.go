package contas

import "testing"

// Teste white-box (package contas) das regrinhas de personalidade — mesmo espírito
// do sweep_internal_test do ratelimit. Foca nas fronteiras dos limiares. A matemática
// de porcentagem (round/clamp) vive em internal/pct e é coberta por pct_test.go; aqui
// o clamp é exercido de ponta a ponta via panicFrom ("estourado clampa").

func TestBankNotePorSaldo(t *testing.T) {
	cases := []struct {
		name              string
		balance           int64
		wantNote, wantTon string
	}{
		{"zerado", 0, "Vazio como minha alma", "error"},
		{"negativo", -100, "Vazio como minha alma", "error"},
		{"abaixo de 100", 5000, "No limite, no susto", "error"},
		{"fronteira 100", 10000, "Sincronizado. Infelizmente", "secondary"},
		{"cheio", 84220, "Sincronizado. Infelizmente", "secondary"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			note, tone := bankNote(tc.balance)
			if note != tc.wantNote || tone != tc.wantTon {
				t.Errorf("bankNote(%d) = (%q,%q), quero (%q,%q)", tc.balance, note, tone, tc.wantNote, tc.wantTon)
			}
		})
	}
}

func TestCardNotePorUso(t *testing.T) {
	cases := []struct {
		used              int
		wantNote, wantTon string
	}{
		{0, "Ainda fingindo controle", "secondary"},
		{39, "Ainda fingindo controle", "secondary"},
		{40, "Vai com calma na maquininha", "primary"},
		{79, "Vai com calma na maquininha", "primary"},
		{80, "Beirando o estouro", "error"},
		{100, "Beirando o estouro", "error"},
	}
	for _, tc := range cases {
		note, tone := cardNote(tc.used)
		if note != tc.wantNote || tone != tc.wantTon {
			t.Errorf("cardNote(%d) = (%q,%q), quero (%q,%q)", tc.used, note, tone, tc.wantNote, tc.wantTon)
		}
	}
}

func TestVoucherStatusNasFronteiras(t *testing.T) {
	cases := []struct {
		remaining int
		want      string
	}{
		{0, "critico"}, {9, "critico"}, {10, "estavel"}, {39, "estavel"}, {40, "ativo"}, {100, "ativo"},
	}
	for _, tc := range cases {
		if got := voucherStatus(tc.remaining); got != tc.want {
			t.Errorf("voucherStatus(%d) = %q, quero %q", tc.remaining, got, tc.want)
		}
	}
}

func TestCashConfidenceClampa(t *testing.T) {
	cases := []struct {
		balance int64
		want    int
	}{
		{0, 0}, {-500, 0}, {12230, 1}, {5000000, 100},
	}
	for _, tc := range cases {
		if got := cashConfidence(tc.balance); got != tc.want {
			t.Errorf("cashConfidence(%d) = %d, quero %d", tc.balance, got, tc.want)
		}
	}
}

func TestPanicFromDerivaPosicaoENivel(t *testing.T) {
	cases := []struct {
		name             string
		debt, limit      int64
		wantPct          int
		wantLevel, wantT string
		wantNote         string
	}{
		{"sem dívida", 0, 500000, 0, "Tranquilo", "secondary", "Dá pra respirar. Por enquanto."},
		{"sem limite → 0", 420000, 0, 0, "Tranquilo", "secondary", "Dá pra respirar. Por enquanto."},
		{"atenção", 250000, 500000, 50, "Atenção", "primary", "Dá pra respirar. Por enquanto."},
		{"crítico", 420000, 500000, 84, "Crítico", "error", "Falência iminente. Esconda o cartão."},
		{"estourado clampa", 600000, 500000, 100, "Crítico", "error", "Falência iminente. Esconda o cartão."},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			pm := panicFrom(tc.debt, tc.limit)
			if pm.Percent != tc.wantPct || pm.LevelLabel != tc.wantLevel || pm.LevelTone != tc.wantT {
				t.Errorf("panicFrom(%d,%d) = {%d,%q,%q}, quero {%d,%q,%q}",
					tc.debt, tc.limit, pm.Percent, pm.LevelLabel, pm.LevelTone, tc.wantPct, tc.wantLevel, tc.wantT)
			}
			if pm.Note != tc.wantNote {
				t.Errorf("panicFrom(%d,%d).Note = %q, quero %q", tc.debt, tc.limit, pm.Note, tc.wantNote)
			}
			if pm.LowLabel != "Tranquilo" || pm.HighLabel != "Colapso" {
				t.Errorf("rótulos extremos = %q/%q, quero Tranquilo/Colapso", pm.LowLabel, pm.HighLabel)
			}
		})
	}
}
