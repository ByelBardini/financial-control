package contas

import "financial-control/server/internal/pct"

// Personalidade derivada da tela de Contas — espelha o padrão do dashboard
// (statusFor/diagnosisBody): funções puras de limiar marcadas PLACEHOLDER, textos
// ajustáveis livremente. Mantém os textos fora do banco (só dado real é persistido).

// bankNote escolhe a ironia + tom da conta de banco pelo saldo. PLACEHOLDER.
func bankNote(balanceCents int64) (note, tone string) {
	switch {
	case balanceCents <= 0:
		return "Vazio como minha alma", "error"
	case balanceCents < 10000: // abaixo de R$ 100
		return "No limite, no susto", "error"
	default:
		return "Sincronizado. Infelizmente", "secondary"
	}
}

// voucherStatus mapeia o % restante do vale para o estado da pílula. PLACEHOLDER.
func voucherStatus(remaining int) string {
	switch {
	case remaining < 10:
		return "critico"
	case remaining < 40:
		return "estavel"
	default:
		return "ativo"
	}
}

// voucherNote escolhe a ironia + tom do vale pelo % restante. PLACEHOLDER.
func voucherNote(remaining int) (note, tone string) {
	switch {
	case remaining < 10:
		return "Socorro, cadê o RH?", "error"
	case remaining < 40:
		return "Vai com calma nos lanches", "neutral"
	default:
		return "Ainda dá pra almoçar fora", "secondary"
	}
}

// cardNote escolhe a ironia + tom do cartão pelo % do limite usado. Os tons batem
// com os níveis do panic (secondary/primary/error) p/ a barra de uso ler igual. PLACEHOLDER.
func cardNote(used int) (note, tone string) {
	switch {
	case used >= 80:
		return "Beirando o estouro", "error"
	case used >= 40:
		return "Vai com calma na maquininha", "primary"
	default:
		return "Ainda fingindo controle", "secondary"
	}
}

// cashQuip escolhe a frase da carteira física pelo saldo. PLACEHOLDER.
func cashQuip(balanceCents int64) string {
	if balanceCents <= 0 {
		return "Nem moeda de 5 centavos sobrou."
	}
	return "Notas amassadas e moedas que o caixa não quis."
}

// cashConfidence deriva a "Confiança Financeira" (0..100): cada R$ 100 em espécie
// vale 1%, até o teto. PLACEHOLDER.
func cashConfidence(balanceCents int64) int {
	if balanceCents <= 0 {
		return 0
	}
	pct := balanceCents / 10000
	if pct > 100 {
		return 100
	}
	return int(pct)
}

// panicFrom monta o Panic Meter a partir da dívida e do limite (centavos).
func panicFrom(debtCents, limitCents int64) PanicMeter {
	percent := pct.Clamp(debtCents, limitCents)
	level, tone := panicLevel(percent)
	return PanicMeter{
		Percent:    percent,
		LevelLabel: level,
		LevelTone:  tone,
		LowLabel:   "Tranquilo",
		HighLabel:  "Colapso",
		Note:       panicNote(percent),
	}
}

// panicLevel mapeia a posição 0..100 do panic para rótulo + tom. PLACEHOLDER.
func panicLevel(percent int) (label, tone string) {
	switch {
	case percent < 40:
		return "Tranquilo", "secondary"
	case percent < 80:
		return "Atenção", "primary"
	default:
		return "Crítico", "error"
	}
}

// panicNote escolhe a nota do panic pelo percentual. PLACEHOLDER.
func panicNote(percent int) string {
	if percent >= 80 {
		return "Falência iminente. Esconda o cartão."
	}
	return "Dá pra respirar. Por enquanto."
}

// tip é a "Dica de Gestão" (texto fixo, irreverente). PLACEHOLDER.
func tip() ManagementTip {
	return ManagementTip{
		Title: "Dica de Gestão",
		Body:  "Se você não abrir o app do banco, o saldo tecnicamente pode ser infinito. Efeito Schrödinger Financeiro.",
	}
}
