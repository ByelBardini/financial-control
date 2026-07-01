package transacoes

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"financial-control/server/internal/pct"
)

// Personalidade + formatação derivadas da tela de Transações — espelha o padrão de
// contas/personality.go e dashboard/statusFor: funções puras, testáveis isoladamente,
// com textos marcados PLACEHOLDER. Nada disso é persistido (só dado real vai ao banco).

// directionView mapeia a direção do banco (income/expense) para o sentido do client
// (inflow/outflow), que tinge valor e ícone na tela.
func directionView(dbDirection string) string {
	if dbDirection == "income" {
		return "inflow"
	}
	return "outflow"
}

// ptMonths são as abreviações de mês em PT-BR (índice 1..12) para o rótulo de data.
var ptMonths = [...]string{"", "JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"}

// dateLabel formata a data de competência como "12 OUT" (dia + mês PT). Pura — não
// depende do relógio, então o teste é determinístico.
func dateLabel(d time.Time) string {
	return fmt.Sprintf("%02d %s", d.Day(), ptMonths[d.Month()])
}

// timeLabel é o rótulo curto do mobile, "12/10" (DD/MM). Também pura (transação só tem
// data de competência, não hora útil) — evita flakiness por relógio.
func timeLabel(d time.Time) string {
	return fmt.Sprintf("%02d/%02d", d.Day(), int(d.Month()))
}

// transactionTag deriva a etiqueta + tom (single-badge) a partir de sinais reais, por
// precedência: aporte/resgate > parcela > recorrente > essencialidade da categoria. Despesa
// avulsa essencial = Sobrevivência; supérflua = Supérfluo; recorrente = Fixo; parcela =
// Parcelado; liquidação de investimento = Investimento. Receita recorrente = Inflow Esperado;
// avulsa = Renda Extra. dbDirection é "income"/"expense", kind é
// "standard"/"installment"/"transfer"/"investment", essentialness é "essential"/"discretionary".
func transactionTag(dbDirection, kind, essentialness string, isRecurring bool) (tag, tone string) {
	if kind == "investment" {
		return "Investimento", "neutral"
	}
	if kind == "installment" {
		return "Parcelado", "primary"
	}
	if dbDirection == "income" {
		if isRecurring {
			return "Inflow Esperado", "secondary"
		}
		return "Renda Extra", "secondary"
	}
	if isRecurring {
		return "Fixo", "primary"
	}
	if essentialness == "essential" {
		return "Sobrevivência", "error"
	}
	return "Supérfluo", "primary"
}

// collapseForecast monta a "Previsão de Colapso" (PanicMeter) a partir de receitas e
// gastos do mês. percent = quanto da receita já foi gasta (0..100).
func collapseForecast(receitasCents, gastosCents int64) PanicMeter {
	percent := pct.Clamp(gastosCents, receitasCents)
	return PanicMeter{
		Percent:    percent,
		LevelLabel: collapseDaysLabel(receitasCents, gastosCents),
		LevelTone:  collapseTone(percent),
		LowLabel:   "Tranquilo",
		HighLabel:  "Colapso",
		Note:       collapseNote(percent),
	}
}

// collapseDaysLabel estima os dias até o colapso: sobra do mês ÷ ritmo de gasto diário
// (gasto/30). Sem gasto → fôlego cheio; sobra ≤ 0 → "0 Dias"; teto de 30. PLACEHOLDER.
func collapseDaysLabel(receitasCents, gastosCents int64) string {
	if gastosCents <= 0 {
		return "30 Dias"
	}
	sobra := receitasCents - gastosCents
	if sobra <= 0 {
		return "0 Dias"
	}
	dailyBurn := gastosCents / 30
	if dailyBurn <= 0 {
		return "30 Dias"
	}
	days := sobra / dailyBurn
	if days > 30 {
		days = 30
	}
	return fmt.Sprintf("%d Dias", days)
}

// collapseTone mapeia o percent gasto para o tom da barra. PLACEHOLDER.
func collapseTone(percent int) string {
	switch {
	case percent < 40:
		return "secondary"
	case percent < 80:
		return "primary"
	default:
		return "error"
	}
}

// collapseNote escolhe a ironia pela pressão do mês. PLACEHOLDER.
func collapseNote(percent int) string {
	if percent >= 80 {
		return "Otimismo é para quem tem limite no cartão."
	}
	return "Dá pra respirar. Por enquanto."
}

// installmentSuffix casa o " (n/m)" no fim da descrição de uma parcela.
var installmentSuffix = regexp.MustCompile(`\s*\(\d+/\d+\)\s*$`)

// debtLabel tira o sufixo de parcela da descrição ("Fone (1/3)" → "Fone").
func debtLabel(description string) string {
	return strings.TrimSpace(installmentSuffix.ReplaceAllString(description, ""))
}

// installmentLabel monta "Parcela X/Y" (lançadas / total).
func installmentLabel(paid, total int) string {
	return fmt.Sprintf("Parcela %d/%d", paid, total)
}

// ptMonthNames são os meses por extenso em PT-BR (índice 1..12) para o rótulo da fatura.
var ptMonthNames = [...]string{"", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
	"Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"}

// faturaLabel monta o rótulo da fatura na Dívidas Futuras: "Fatura Março/2026 - Nubank".
// month vem como "YYYY-MM"; formato inesperado cai no cru ("Fatura {month} - {card}").
func faturaLabel(cardName, month string) string {
	t, err := time.Parse("2006-01", month)
	if err != nil {
		return fmt.Sprintf("Fatura %s - %s", month, cardName)
	}
	return fmt.Sprintf("Fatura %s/%d - %s", ptMonthNames[t.Month()], t.Year(), cardName)
}

// debtTone tinge a barra da dívida pelo progresso. PLACEHOLDER.
func debtTone(percent int) string {
	if percent >= 80 {
		return "error"
	}
	return "primary"
}

// debtNote escolhe a ironia da dívida pelo progresso. PLACEHOLDER.
func debtNote(percent int) string {
	if percent >= 80 {
		return "Quase quitado. Respira."
	}
	return "Decisão financeira questionável."
}
