package transacoes

import (
	"testing"
	"time"
)

func date(y int, m time.Month, d int) time.Time {
	return time.Date(y, m, d, 0, 0, 0, 0, time.UTC)
}

func ptrTime(t time.Time) *time.Time { return &t }
func ptrInt(n int) *int              { return &n }

// previousSunday recua até o domingo (independente de periodStart, pra testá-lo sem circularidade).
func previousSunday(t time.Time) time.Time {
	for t.Weekday() != time.Sunday {
		t = t.AddDate(0, 0, -1)
	}
	return t
}

func TestPeriodStart(t *testing.T) {
	sunday := previousSunday(date(2026, 6, 10))
	if sunday.Weekday() != time.Sunday {
		t.Fatalf("setup: %v não é domingo", sunday)
	}
	saturday := sunday.AddDate(0, 0, 6)
	nextSunday := sunday.AddDate(0, 0, 7)

	cases := []struct {
		name string
		freq string
		in   time.Time
		want time.Time
	}{
		{"daily é o próprio dia", "daily", date(2026, 6, 17), date(2026, 6, 17)},
		{"weekly no domingo é o domingo", "weekly", sunday, sunday},
		{"weekly no sábado volta pro domingo da semana", "weekly", saturday, sunday},
		{"weekly no próximo domingo avança", "weekly", nextSunday, nextSunday},
		{"monthly é o dia 1", "monthly", date(2026, 6, 17), date(2026, 6, 1)},
		{"yearly é 1º de janeiro", "yearly", date(2026, 6, 17), date(2026, 1, 1)},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := periodStart(tc.freq, tc.in)
			if !got.Equal(tc.want) {
				t.Errorf("periodStart(%q, %v) = %v, quer %v", tc.freq, tc.in, got, tc.want)
			}
		})
	}
}

// Regressão: hoje vem do relógio local (fuso negativo) e o last_occurred_on vem como data UTC do
// banco. Mesmo dia civil → NÃO devido. Antes, comparar instantes fazia "1º jun -03:00" parecer
// depois de "1º jun UTC" e a recorrência reaparecia logo após registrar.
func TestIsDueIgnoraFusoEntreRelogioLocalEDataUTC(t *testing.T) {
	saoPaulo := time.FixedZone("BRT", -3*60*60)
	todayLocal := time.Date(2026, 6, 17, 21, 0, 0, 0, saoPaulo) // 18 jun 00:00 UTC, mas dia civil = 17
	lastUTC := time.Date(2026, 6, 17, 0, 0, 0, 0, time.UTC)     // registrado hoje (data do banco)
	if isDue("monthly", date(2026, 6, 1), nil, nil, &lastUTC, 1, todayLocal) {
		t.Error("mensal registrado hoje (data UTC) não deveria estar devido visto do fuso local")
	}
	if isDue("daily", date(2026, 6, 1), nil, nil, &lastUTC, 1, todayLocal) {
		t.Error("diário registrado hoje (data UTC) não deveria estar devido visto do fuso local")
	}
}

func TestIsDue(t *testing.T) {
	sunday := previousSunday(date(2026, 6, 10))
	saturdaySameWeek := sunday.AddDate(0, 0, 6)
	nextSunday := sunday.AddDate(0, 0, 7)
	saturdayPrevWeek := sunday.AddDate(0, 0, -1)

	cases := []struct {
		name   string
		freq   string
		start  time.Time
		end    *time.Time
		maxOcc *int
		last   *time.Time
		count  int
		today  time.Time
		want   bool
	}{
		// começo / fim / limite
		{"start no futuro não é devido", "monthly", date(2026, 7, 1), nil, nil, nil, 0, date(2026, 6, 17), false},
		{"today==start, nunca registrada, é devido", "monthly", date(2026, 6, 1), nil, nil, nil, 0, date(2026, 6, 1), true},
		{"nunca registrada e já começou é devido", "daily", date(2026, 6, 1), nil, nil, nil, 0, date(2026, 6, 17), true},
		{"encerrada (today>end) não é devido", "monthly", date(2026, 1, 1), ptrTime(date(2026, 5, 31)), nil, nil, 5, date(2026, 6, 1), false},
		{"today==end ainda é devido", "daily", date(2026, 6, 1), ptrTime(date(2026, 6, 17)), nil, nil, 0, date(2026, 6, 17), true},
		{"max atingido não é devido", "monthly", date(2026, 1, 1), nil, ptrInt(3), ptrTime(date(2026, 3, 1)), 3, date(2026, 6, 1), false},
		{"abaixo do max é devido", "monthly", date(2026, 1, 1), nil, ptrInt(6), ptrTime(date(2026, 5, 1)), 5, date(2026, 6, 1), true},

		// diário
		{"diário registrado hoje não é devido", "daily", date(2026, 6, 1), nil, nil, ptrTime(date(2026, 6, 17)), 1, date(2026, 6, 17), false},
		{"diário registrado ontem é devido", "daily", date(2026, 6, 1), nil, nil, ptrTime(date(2026, 6, 16)), 1, date(2026, 6, 17), true},

		// semanal (domingo = início)
		{"semanal: registrado no sábado anterior, hoje domingo → devido", "weekly", date(2026, 1, 1), nil, nil, ptrTime(saturdayPrevWeek), 1, sunday, true},
		{"semanal: registrado no domingo, hoje sábado da mesma semana → não", "weekly", date(2026, 1, 1), nil, nil, ptrTime(sunday), 1, saturdaySameWeek, false},
		{"semanal: registrado no domingo, hoje próximo domingo → devido", "weekly", date(2026, 1, 1), nil, nil, ptrTime(sunday), 1, nextSunday, true},

		// mensal / anual
		{"mensal: registrado há 3 meses → devido (sem backfill, registra só o atual)", "monthly", date(2026, 1, 1), nil, nil, ptrTime(date(2026, 3, 10)), 3, date(2026, 6, 17), true},
		{"mensal: registrado neste mês → não", "monthly", date(2026, 1, 1), nil, nil, ptrTime(date(2026, 6, 2)), 6, date(2026, 6, 17), false},
		{"anual: registrado ano passado → devido", "yearly", date(2024, 1, 1), nil, nil, ptrTime(date(2025, 8, 1)), 2, date(2026, 1, 1), true},
		{"anual: registrado neste ano → não", "yearly", date(2024, 1, 1), nil, nil, ptrTime(date(2026, 1, 5)), 3, date(2026, 6, 17), false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := isDue(tc.freq, tc.start, tc.end, tc.maxOcc, tc.last, tc.count, tc.today)
			if got != tc.want {
				t.Errorf("isDue = %v, quer %v", got, tc.want)
			}
		})
	}
}
