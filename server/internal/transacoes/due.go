package transacoes

import "time"

// periodStart devolve o início do período-calendário que contém d, conforme a frequência:
// daily = o próprio dia; weekly = o domingo <= d (semana começa no domingo, não na segunda do
// date_trunc do Postgres); monthly = dia 1; yearly = 1º de janeiro.
//
// Usa a DATA-civil de d (ano/mês/dia) numa localização fixa (UTC): hoje vem do relógio local e o
// last_occurred_on vem como data UTC do banco — comparar instantes com fusos diferentes faria
// "1º jun -03:00" parecer depois de "1º jun UTC". Normalizando pro mesmo fuso, a comparação é
// puramente por calendário.
func periodStart(freq string, d time.Time) time.Time {
	day := civilDay(d)
	switch freq {
	case "weekly":
		return day.AddDate(0, 0, -int(day.Weekday())) // time.Sunday == 0
	case "monthly":
		return time.Date(day.Year(), day.Month(), 1, 0, 0, 0, 0, time.UTC)
	case "yearly":
		return time.Date(day.Year(), 1, 1, 0, 0, 0, 0, time.UTC)
	default: // daily
		return day
	}
}

// isDue decide se a ocorrência do período corrente de uma recorrência ainda está pendente de
// registro. "Devido" = a regra já começou, não encerrou, não bateu o limite, e o período-calendário
// de hoje é mais novo que o do último lançamento ligado à regra (ou nunca houve lançamento).
//
// Sem backfill: um registro cobre só o período atual — períodos pulados não voltam. interval_count
// é ignorado na V1 (o client sempre manda 1); os períodos são puramente alinhados ao calendário.
func isDue(
	freq string,
	start time.Time,
	end *time.Time,
	maxOcc *int,
	lastOccurredOn *time.Time,
	occurrenceCount int,
	today time.Time,
) bool {
	today = civilDay(today)
	if today.Before(civilDay(start)) {
		return false
	}
	if end != nil && today.After(civilDay(*end)) {
		return false
	}
	if maxOcc != nil && occurrenceCount >= *maxOcc {
		return false
	}
	if lastOccurredOn == nil {
		return true
	}
	return periodStart(freq, today).After(periodStart(freq, *lastOccurredOn))
}

// civilDay devolve a data-civil de t (ano/mês/dia do relógio de t) à meia-noite em UTC. Usar um
// fuso fixo torna as comparações de período independentes do fuso de origem (relógio local vs data
// UTC do banco) — ver periodStart.
func civilDay(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
}
