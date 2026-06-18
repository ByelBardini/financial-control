// rowsForHeight calcula quantas linhas de altura uniforme cabem em bodyHeight, sabendo que
// `count` linhas renderizadas ocupam contentHeight (altura média da linha = contentHeight/count).
// Arredonda pra baixo — a página nunca estoura a tela antes de paginar. Retorna 0 quando ainda
// não dá pra calcular (alguma medida ausente no 1º layout); aí o chamador mantém o default do
// server. Quando calculável é sempre ≥ 1 (nunca paginação de 0 linhas).
export function rowsForHeight(bodyHeight: number, contentHeight: number, count: number): number {
  if (count <= 0 || bodyHeight <= 0 || contentHeight <= 0) return 0;
  const rowHeight = contentHeight / count;
  if (rowHeight <= 0) return 0;
  return Math.max(1, Math.floor(bodyHeight / rowHeight));
}
