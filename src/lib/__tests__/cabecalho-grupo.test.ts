import { describe, expect, it } from "vitest";
import { agruparCabecalho, separarGrupoColuna } from "@/lib/colunas-tabela";
import { cartaoDeIndicadores, cartaoSchema } from "@/lib/graficos";

describe("separarGrupoColuna e agruparCabecalho", () => {
  it("separa grupo e coluna pelo primeiro ' · '", () => {
    expect(separarGrupoColuna("Contatos novos · Meta ADS")).toEqual({ grupo: "Contatos novos", coluna: "Meta ADS" });
    expect(separarGrupoColuna("Conversas")).toEqual({ grupo: null, coluna: "Conversas" });
    expect(separarGrupoColuna("A · B · C")).toEqual({ grupo: "A", coluna: "B · C" });
  });

  it("agrupa apenas colunas vizinhas com o mesmo grupo e mantém temGrupo false sem separador", () => {
    const sem = agruparCabecalho([{ nome: "Contatos" }, { nome: "Conversas" }]);
    expect(sem.temGrupo).toBe(false);
    expect(sem.grupos).toHaveLength(2);

    const com = agruparCabecalho([
      { nome: "Contatos novos · Total" },
      { nome: "Contatos novos · Meta ADS" },
      { nome: "Sem grupo" },
      { nome: "Contatos novos · Orgânico" },
      { nome: "Agendamentos · Total" },
    ]);
    expect(com.temGrupo).toBe(true);
    expect(com.grupos.map((g) => ({ grupo: g.grupo, n: g.cols.length }))).toEqual([
      { grupo: "Contatos novos", n: 2 },
      { grupo: null, n: 1 },
      { grupo: "Contatos novos", n: 1 },
      { grupo: "Agendamentos", n: 1 },
    ]);
  });

  it("cartaoDeIndicadores soma múltiplas séries no mesmo dia", () => {
    const cfg = cartaoSchema.parse({
      id: "cn-dia",
      titulo: "Contatos novos por dia",
      tipo: "barras_empilhadas",
      fonte: "contato",
      medida: "indicador",
      indicadores: ["pat", "npat"],
    });
    const res = cartaoDeIndicadores(
      [
        { dia: "2026-11-17", celulas: { pat: { valor: 3 }, npat: { valor: 8 } } },
        { dia: "2026-11-24", celulas: { pat: { valor: 3 }, npat: { valor: 8 } } },
      ],
      [
        { chave: "pat", rotulo: "Patrocinado" },
        { chave: "npat", rotulo: "Não patrocinado" },
      ],
      cfg,
      null,
    );
    expect(res.series).toEqual(["Patrocinado", "Não patrocinado"]);
    expect(res.total).toBe(22);
    expect(res.categorias).toEqual([
      { rotulo: "2026-11-17", valores: { Patrocinado: 3, "Não patrocinado": 8 }, total: 11 },
      { rotulo: "2026-11-24", valores: { Patrocinado: 3, "Não patrocinado": 8 }, total: 11 },
    ]);
  });

  it("cartaoDeIndicadores em rosca devolve uma fatia por indicador com total do período", () => {
    const cfg = cartaoSchema.parse({
      id: "pat-rosca",
      titulo: "Patrocinado e não patrocinado",
      tipo: "rosca",
      fonte: "contato",
      medida: "indicador",
      indicadores: ["pat", "npat"],
    });
    const res = cartaoDeIndicadores(
      [
        { dia: "2026-11-17", celulas: { pat: { valor: 3 }, npat: { valor: 8 } } },
        { dia: "2026-11-24", celulas: { pat: { valor: 4 }, npat: { valor: 7 } } },
      ],
      [
        { chave: "pat", rotulo: "Patrocinado" },
        { chave: "npat", rotulo: "Não patrocinado" },
      ],
      cfg,
      null,
    );
    expect(res.total).toBe(22);
    expect(res.categorias).toEqual([
      { rotulo: "Patrocinado", valores: { Valor: 7 }, total: 7 },
      { rotulo: "Não patrocinado", valores: { Valor: 15 }, total: 15 },
    ]);
  });
});