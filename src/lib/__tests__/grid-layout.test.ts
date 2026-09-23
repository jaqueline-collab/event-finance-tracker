import { describe, expect, it } from "vitest";
import {
  COLUNAS,
  compactar,
  moverBloco,
  normalizarGrade,
  ordemVisual,
  proximaPosicao,
  redimensionarBloco,
  sanearLayout,
} from "@/lib/grid-layout";

const bloco = (id: string, x: number, y: number, w = 6, h = 4) => ({
  id,
  layout: { x, y, w, h },
  item: { id },
});

describe("grade do painel", () => {
  it("saneia layout inválido e respeita o mínimo", () => {
    expect(sanearLayout(null)).toBeNull();
    expect(sanearLayout({ x: -5, y: -2, w: 1, h: 1 })).toEqual({ x: 0, y: 0, w: 3, h: 2 });
    expect(sanearLayout({ x: 10, y: 1, w: 12, h: 3 })).toEqual({ x: 0, y: 1, w: 12, h: 3 });
  });

  it("posiciona widgets sem layout em sequência, sem sobrepor", () => {
    const grade = normalizarGrade([
      { id: "a", ordem: 0 },
      { id: "b", ordem: 1 },
      { id: "c", ordem: 2 },
    ]);
    expect(grade).toHaveLength(3);
    for (const g of grade) expect(g.layout.x + g.layout.w).toBeLessThanOrEqual(COLUNAS);
    const pares = grade.flatMap((a, i) => grade.slice(i + 1).map((b) => [a, b] as const));
    for (const [a, b] of pares) {
      const sobrepoe =
        a.layout.x < b.layout.x + b.layout.w &&
        a.layout.x + a.layout.w > b.layout.x &&
        a.layout.y < b.layout.y + b.layout.h &&
        a.layout.y + a.layout.h > b.layout.y;
      expect(sobrepoe).toBe(false);
    }
  });

  it("empurra o bloco existente para baixo ao soltar outro em cima", () => {
    const grade = [bloco("a", 0, 0), bloco("b", 0, 4)];
    const movida = moverBloco(grade, "b", 0, 0);
    const a = movida.find((x) => x.id === "a")!;
    const b = movida.find((x) => x.id === "b")!;
    expect(b.layout.y).toBe(0);
    expect(a.layout.y).toBeGreaterThanOrEqual(b.layout.h);
  });

  it("compacta para cima quando sobra espaço", () => {
    const grade = compactar([bloco("a", 0, 6)]);
    expect(grade[0].layout.y).toBe(0);
  });

  it("redimensiona respeitando o mínimo e a largura da grade", () => {
    const grade = redimensionarBloco([bloco("a", 8, 0, 4, 4)], "a", 12, 1);
    expect(grade[0].layout.w).toBe(4);
    expect(grade[0].layout.h).toBe(2);
  });

  it("empilha na ordem de cima para baixo e esquerda para direita", () => {
    const ordem = ordemVisual([bloco("dir", 6, 0), bloco("baixo", 0, 4), bloco("esq", 0, 0)]).map(
      (x) => x.id,
    );
    expect(ordem).toEqual(["esq", "dir", "baixo"]);
  });

  it("acha a próxima posição livre", () => {
    expect(proximaPosicao([bloco("a", 0, 0)], 6, 4)).toEqual({ x: 6, y: 0, w: 6, h: 4 });
  });
});
