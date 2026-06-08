package pct_test

import (
	"testing"

	"financial-control/server/internal/pct"
)

func TestRound(t *testing.T) {
	cases := []struct {
		name        string
		part, whole int64
		want        int
	}{
		{"metade arredonda pra 50", 1, 2, 50},
		{"dois terços arredonda pra cima", 2, 3, 67},
		{"whole zero devolve 0 (sem divisão por zero)", 5, 0, 0},
		{"whole negativo devolve 0", 5, -10, 0},
		{"passa de 100 sem clamp (gasto > receita)", 150, 100, 150},
		{"zero", 0, 100, 0},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := pct.Round(tc.part, tc.whole); got != tc.want {
				t.Errorf("Round(%d, %d) = %d, quero %d", tc.part, tc.whole, got, tc.want)
			}
		})
	}
}

func TestClamp(t *testing.T) {
	cases := []struct {
		name        string
		part, whole int64
		want        int
	}{
		{"dentro do intervalo", 1, 2, 50},
		{"estoura o teto vira 100", 150, 100, 100},
		{"negativo vira 0", -50, 100, 0},
		{"whole zero vira 0", 5, 0, 0},
		{"limite exato 100", 100, 100, 100},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := pct.Clamp(tc.part, tc.whole); got != tc.want {
				t.Errorf("Clamp(%d, %d) = %d, quero %d", tc.part, tc.whole, got, tc.want)
			}
		})
	}
}
