import { rowsForHeight } from '../../src/lib/fitRows';

// O desktop mede o corpo da lista (bodyHeight) e a altura ocupada pelas linhas renderizadas
// (contentHeight, sobre `count` linhas) pra derivar o pageSize. Aqui fixamos a matemática:
// altura média = contentHeight/count; cabe floor(bodyHeight / média).
describe('rowsForHeight', () => {
  it('cabe floor(body / altura-média-da-linha)', () => {
    // 10 linhas ocupam 650 → 65px/linha; corpo de 600 → floor(600/65) = 9
    expect(rowsForHeight(600, 650, 10)).toBe(9);
  });

  it('arredonda pra baixo — nunca estoura a tela', () => {
    expect(rowsForHeight(599, 650, 10)).toBe(9); // 599/65 = 9.2 → 9
    expect(rowsForHeight(650, 650, 10)).toBe(10); // exato
  });

  it('mínimo de 1 quando cabe menos que uma linha', () => {
    expect(rowsForHeight(30, 650, 10)).toBe(1); // 30/65 < 1 → 1
  });

  it('retorna 0 (incalculável) quando falta alguma medida', () => {
    expect(rowsForHeight(0, 650, 10)).toBe(0);
    expect(rowsForHeight(600, 0, 10)).toBe(0);
    expect(rowsForHeight(600, 650, 0)).toBe(0);
  });
});
