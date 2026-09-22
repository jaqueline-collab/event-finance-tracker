import { describe, expect, it } from "vitest";
import {
  calcularPontos,
  extrairYoutubeId,
  medalhasElegiveis,
  nivelPara,
  trilhaConcluida,
  videoAtual,
  videoLiberado,
  type Medalha,
  type Trilha,
} from "@/lib/treinamento";

const video = (id: string, ordem: number, pontos: number) => ({
  id,
  titulo: `Vídeo ${ordem}`,
  descricao: null,
  youtubeId: "dQw4w9WgXcQ",
  youtubeUrl: "https://youtu.be/dQw4w9WgXcQ",
  ordem,
  pontos,
});

const trilha: Trilha = {
  id: "t1",
  titulo: "Trilha do parceiro",
  descricao: null,
  audiencia: "parceiro",
  ativa: true,
  pontosBonusConclusao: 50,
  ordem: 1,
  videos: [video("v1", 1, 10), video("v2", 2, 20), video("v3", 3, 30)],
};

describe("Ordem dos vídeos", () => {
  it("o primeiro sempre libera; os seguintes só depois do anterior", () => {
    const nada = new Set<string>();
    expect(videoLiberado(trilha, "v1", nada)).toBe(true);
    expect(videoLiberado(trilha, "v2", nada)).toBe(false);
    expect(videoLiberado(trilha, "v3", nada)).toBe(false);

    const um = new Set(["v1"]);
    expect(videoLiberado(trilha, "v2", um)).toBe(true);
    // Pular o segundo não libera o terceiro.
    expect(videoLiberado(trilha, "v3", um)).toBe(false);
    expect(videoLiberado(trilha, "v3", new Set(["v1", "v2"]))).toBe(true);
  });

  it("o vídeo atual é o primeiro não concluído", () => {
    expect(videoAtual(trilha, new Set(["v1"]))?.id).toBe("v2");
    expect(videoAtual(trilha, new Set(["v1", "v2", "v3"]))?.id).toBe("v3");
  });
});

describe("Pontos, níveis e medalhas", () => {
  it("soma pontos por vídeo e aplica o bônus só com a trilha inteira", () => {
    expect(calcularPontos([trilha], new Set(["v1", "v2"]))).toBe(30);
    expect(calcularPontos([trilha], new Set(["v1", "v2", "v3"]))).toBe(110);
    expect(trilhaConcluida(trilha, new Set(["v1", "v2"]))).toBe(false);
  });

  it("o nível é a maior faixa alcançada", () => {
    const niveis = [
      { nivel: 1, pontosMinimos: 0, nome: "Iniciante", icone: null },
      { nivel: 2, pontosMinimos: 100, nome: "Intermediário", icone: null },
      { nivel: 3, pontosMinimos: 300, nome: "Avançado", icone: null },
    ];
    expect(nivelPara(0, niveis)?.nome).toBe("Iniciante");
    expect(nivelPara(110, niveis)?.nome).toBe("Intermediário");
    expect(nivelPara(999, niveis)?.nome).toBe("Avançado");
  });

  it("os três critérios de medalha disparam no momento certo", () => {
    const medalhas: Medalha[] = [
      { id: "m1", nome: "Trilha feita", descricao: null, icone: null, criterioTipo: "trilha", criterioValor: "t1" },
      { id: "m2", nome: "100 pontos", descricao: null, icone: null, criterioTipo: "pontos", criterioValor: "100" },
      { id: "m3", nome: "3 vídeos", descricao: null, icone: null, criterioTipo: "videos", criterioValor: "3" },
    ];
    const parcial = medalhasElegiveis(medalhas, {
      pontos: 30,
      videosConcluidos: 2,
      trilhasConcluidas: new Set<string>(),
    });
    expect(parcial).toHaveLength(0);

    const completo = medalhasElegiveis(medalhas, {
      pontos: 110,
      videosConcluidos: 3,
      trilhasConcluidas: new Set(["t1"]),
    });
    expect(completo.map((m) => m.id).sort()).toEqual(["m1", "m2", "m3"]);
  });
});

describe("Link do YouTube", () => {
  it("aceita os formatos usados na prática", () => {
    expect(extrairYoutubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extrairYoutubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10")).toBe("dQw4w9WgXcQ");
    expect(extrairYoutubeId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extrairYoutubeId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extrairYoutubeId("https://vimeo.com/123")).toBeNull();
  });
});
