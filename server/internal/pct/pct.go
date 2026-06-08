// Package pct converte razões parte/todo em porcentagem inteira, com guarda contra
// divisão por zero. Único lugar com essa matemática — dashboard e contas reusam, em
// vez de cada domínio reimplementar a fórmula.
package pct

// Round devolve round(part/whole*100), ou 0 quando whole <= 0. Pode passar de 100
// (ex.: gasto > receita no spentPercent), de propósito — quem precisa de barra 0..100
// usa Clamp. Ex.: Round(2, 3) == 67; Round(5, 0) == 0; Round(150, 100) == 150.
func Round(part, whole int64) int {
	if whole <= 0 {
		return 0
	}
	return int((part*100 + whole/2) / whole)
}

// Clamp é o Round limitado a 0..100, para posição de barra (panic, % restante do vale,
// uso do limite do cartão), onde a razão pode estourar (dívida > limite) ou ficar
// negativa (vale no vermelho). Ex.: Clamp(150, 100) == 100; Clamp(-50, 100) == 0.
func Clamp(part, whole int64) int {
	p := Round(part, whole)
	if p < 0 {
		return 0
	}
	if p > 100 {
		return 100
	}
	return p
}
