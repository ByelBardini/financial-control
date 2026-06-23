package investimentos

import "strconv"

// Personalidade da carteira de Investimentos — espelha o padrão de contas/dashboard: títulos,
// rótulos e tons fixos + frases por limiar de desempenho. Funções puras marcadas PLACEHOLDER,
// textos ajustáveis livremente. Mantém a cópia fora do banco (só dado real é persistido). Os
// textos batem com o mock do client pra a tela ficar idêntica ao ligar a API.

// zeroQuantity é a string que o SQL devolve pra uma posição totalmente vendida (8 casas).
const zeroQuantity = "0.00000000"

const (
	summaryTitle = "Portfólio de Ilusões"
	cryptoTitle  = "O Circo da Volatilidade"
)

// allocationOrder fixa a ordem das fatias da alocação (e quais classes são do portfólio geral —
// cripto fica fora de propósito).
var allocationOrder = []string{"acoes", "fiis", "renda_fixa"}

// summaryQuip escolhe a frase do resumo pelo desempenho (% de ganho/perda). PLACEHOLDER.
func summaryQuip(gainPct float64) string {
	switch {
	case gainPct >= 5:
		return "No azul. Aproveite antes que vire vermelho."
	case gainPct >= 0:
		return "Empatando com o tédio."
	case gainPct >= -10:
		return "Diversificado entre o tombo e o quase-tombo."
	default:
		return "Sangrando em várias frentes."
	}
}

// cryptoSubtitle descreve o bloco de cripto pela quantidade de ativos "no picadeiro" (tom do
// "Circo da Volatilidade"). Vazio quando não há holdings — o JSON omite o campo. PLACEHOLDER.
func cryptoSubtitle(holdings int) string {
	if holdings <= 0 {
		return ""
	}
	if holdings == 1 {
		return "1 ativo no picadeiro"
	}
	return strconv.Itoa(holdings) + " ativos no picadeiro"
}

// classLabel é o rótulo de exibição de cada classe do portfólio geral. PLACEHOLDER.
func classLabel(class string) string {
	switch class {
	case "acoes":
		return "Ações"
	case "fiis":
		return "FIIs"
	case "renda_fixa":
		return "Renda Fixa"
	default:
		return class
	}
}

// classTone é a cor (tom) de cada classe na barra/legenda de alocação. PLACEHOLDER.
func classTone(class string) string {
	switch class {
	case "acoes":
		return "primary"
	case "fiis":
		return "secondary"
	default: // renda_fixa
		return "neutral"
	}
}
